var express = require('express')
var app = express()
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const Blockchain = require('./blockchain');
const uuid = require('uuid/v1');
const port = process.argv[2];
const rp = require('request-promise');
const checkAuth = require('./api/middleware/check-auth');

const nodeAddress = uuid().split('-').join('');
const bitcoin = new Blockchain();

const userRoutes = require('./api/routes/users');
const morgan = require('morgan'); //log incoming request to console
const mongoose = require('mongoose');
let token = '';
mongoose.connect('mongodb+srv://monoluk666:'+process.env.MONGO_ATLAS_PW+'@blockuser-l8ywg.mongodb.net/test?retryWrites=true', {
	//useMongoClient: true,
	useNewUrlParser:true
});

mongoose.Promise = global.Promise; //get rid of depricated message

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));


//addressing Cors
app.use((req,res,next)=>{
	res.header("Access-Control-Allow-Origin", '*');
	res.header("Access-Control-Allow-Headers", 
				"Origin, X-Requested-With, Content-Type, Accept, Authorization");
	res.header('Access-Control-Allow-Credentials', true);
	if(req.method === 'OPTIONS'){
		res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
		return res.status(200).json({});
	}
	next();
});

// app.use(function(req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//   next();
// });
app.use(cookieParser());
app.use('/users', userRoutes);



//blockchain apis
app.get('/blockchain', function (req,res){
res.json(bitcoin);
});


app.post('/transaction', function(req, res){
		if (!bitcoin.enoughBalance(req.body.newTransaction['amount'],req.body.newTransaction['sender']))
		res.json({note : 'insufficient fund'});
	else
	{const index = bitcoin.addTransactionToPendingTransactions(req.body.newTransaction);
		bitcoin.updateUTXO(req.body.newTransaction['amount'],req.body.newTransaction['sender']);
	res.json ({note: `New Transaction will be added to block ${index}. `});}
});



app.post('/transaction/broadcast',checkAuth,function (req, res){
	console.log('from backend'+req.body.amount, req.body.sender)
	if (!bitcoin.enoughBalance(req.body.amount,req.body.sender))
		res.json({note : 'insufficient fund'});
	else
{
	bitcoin.updateUTXO(req.body.amount,req.body.sender);
	const newTransaction = bitcoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
const index = bitcoin.addTransactionToPendingTransactions(newTransaction);

const requestPromises = [];
bitcoin.networkNodes.forEach(networkNodeUrl => {
	const requestOptions ={
		uri : networkNodeUrl + '/transaction',
		method : 'POST',
		body : {newTransaction: newTransaction},
		json : true
	};
requestPromises.push(rp(requestOptions));
});
Promise.all(requestPromises).then(data=>{
res.json({note: 'Transaction created and broadcast successfully',
			amount:newTransaction.amount,
			sender : newTransaction.sender,
			recipient : newTransaction.recipient,
			transactionId : newTransaction.transactionId
		});
});}
});

app.get('/mine', function(req, res){
	const token = req.headers.authorization;
	
	const lastBlock = bitcoin.getLastBlock();
	const currentBlockData = {
		transactions : bitcoin.pendingTransactions,
		index : lastBlock['index'] + 1
	};
	
	const previousHash = lastBlock['hash'];
	const nonce = bitcoin.proofOfWork(previousHash, currentBlockData);
	const hash = bitcoin.hashBlock(previousHash,currentBlockData,nonce);
	
const newBlock = bitcoin.createNewBlock(nonce, previousHash,hash);
const requestPromises = [];
bitcoin.networkNodes.forEach(networkNodeUrl =>{
	const requestOptions = {
		uri : networkNodeUrl + '/receive-new-block',
		method : 'POST',
		body : {newBlock: newBlock,
				utxo : bitcoin.UTXO},
		json :true
	}
	requestPromises.push(rp(requestOptions));
});
Promise.all(requestPromises)
.then(data =>{
	const requestOptions = {
		uri : bitcoin.currentNodeUrl + '/transaction/broadcast',
		method :'post',
		headers:{Authorization : token},
		body : {amount: 12.5,
				sender : "00",
				recipient : nodeAddress
			},
		json : true
	};
	return rp(requestOptions);
})
	.then(data =>{
res.json({
	note : "New block mined & broadcast successfully",
	block : newBlock
	});
	});
});



app.post ('/receive-new-block', function (req, res){
	const newBlock = req.body.newBlock;
	const newUTXO = req.body.utxo;
	const lastBlock = bitcoin.getLastBlock();
	const correctHash = lastBlock['hash'] === newBlock['previousBlockHash'];
	const correctIndex = lastBlock['index'] === newBlock['index'] - 1;

 	if(correctHash && correctIndex)	{
 		bitcoin.chain.push(newBlock);
 		bitcoin.UTXO = newUTXO;
 		bitcoin.pendingTransactions = [];
res.json ({note: 'New Block received and accepted',
newBlock : newBlock
});
} else{
	res.json({
		note : 'New block rejected,',
		newBlock : newBlock
	});
}
});





app.post('/register-and-broadcast-node', function (req,res){
	const newNodeUrl = req.body.newNodeUrl;
	const notCurrentNode = newNodeUrl !== bitcoin.currentNodeUrl;
	if (bitcoin.networkNodes.indexOf(newNodeUrl) == -1 && notCurrentNode) bitcoin.networkNodes.push(newNodeUrl);

const regNodesPromises = [];
	bitcoin.networkNodes.forEach(networkNodeUrl => {
		const requestOptions = {
			uri: networkNodeUrl + '/register-node',
			method: 'POST',
			body: { newNodeUrl: newNodeUrl },
			json: true
		};

		regNodesPromises.push(rp(requestOptions));
	});

Promise.all(regNodesPromises)
.then(data =>{
	const bulkRegisterOptions = {
		uri: newNodeUrl +'/register-nodes-bulk',
		method : 'POST',
		body : {allNetworkNodes : [ ...bitcoin.networkNodes, bitcoin.currentNodeUrl ]},
		json : true
	};
	return rp(bulkRegisterOptions);
})
	 .then(data => {
	 	res.json({note : 'New node registered with network successfully.'});
});
});


app.post('/register-node', function(req, res) {
	const newNodeUrl = req.body.newNodeUrl;
	const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) == -1;
	const notCurrentNode = bitcoin.currentNodeUrl !== newNodeUrl;
	if (nodeNotAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(newNodeUrl);
	res.json({ note: 'New node registered successfully.' });
});



app.post('/register-nodes-bulk', function (req,res){
	const allNetworkNodes = req.body.allNetworkNodes;

	allNetworkNodes.forEach(networkNodeUrl =>{
		const notCurrentNode = networkNodeUrl !== bitcoin.currentNodeUrl;
		const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(networkNodeUrl) == -1;
		if (nodeNotAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(networkNodeUrl);
	});
	res.json ({note: 'Bulk registration successful.'});

});

app.get('/consensus', function(req, res){
	const requestPromises = [];
	bitcoin.networkNodes.forEach(networkNodeUrl =>{
		const requestOptions = {
			uri : networkNodeUrl + '/blockchain',
			method : 'GET',
			json : true
		};
		requestPromises.push(rp(requestOptions));
	});
	Promise.all(requestPromises)
	.then(blockchains =>{
		const currentChainLength = bitcoin.chain.length;
		let maxChainLength = currentChainLength;
		let newLongestChain = null;
		let newPendingTransactions = null;
		let newUTXO = null;

		blockchains.forEach(blockchain =>{
			if (blockchain.chain.length > maxChainLength)
				{maxChainLength = blockchain.chain.length;
				newLongestChain = blockchain.chain;
				newPendingTransactions = blockchain.pendingTransactions;
				newUTXO = blockchain.UTXO;
			};
		});
			if (!newLongestChain || (newLongestChain && !bitcoin.chainIsValid(newLongestChain))){
				res.json({note : 'Current chain has not been replaced',
			CurrentChain: bitcoin.chain
		});
	}
	else {
		bitcoin.chain = newLongestChain;
		bitcoin.pendingTransactions = newPendingTransactions;
		bitcoin.UTXO = newUTXO;
		res.json({
			note : 'This chain has been replaced',
			chain: bitcoin.chain,
			utxo : bitcoin.UTXO
		});
	}
	});
});

app.get('/block/:blockHash', function (req, res,next){
	blockHash = req.params.blockHash;
	const correctBlock = bitcoin.getBlock(blockHash);
	res.json(
		{index:correctBlock.index,
		 timestamp: correctBlock.timestamp,
		 nonce: correctBlock.nonce,
		 merkleRoot : correctBlock.merkleRoot,
		 hash: correctBlock.hash,
		 previousBlockHash : correctBlock.previousBlockHash,
		 transactions : correctBlock.transactions}
	);

});


app.get('/transaction/:transactionId', function (req, res) {
	const transactionId = req.params.transactionId;
	const transactionData = bitcoin.getTransaction(transactionId);
	res.json ({
		transaction : transactionData.transaction,
		inBlock : transactionData.block
	});
});

app.get('/address/:address', function (req, res){
const address = req.params.address;
const addressData = bitcoin.getAddressData(address);
res.json ({
addressData : addressData
});
});

app.get('/block-explorer', function (req, res){
	res.sendFile('./block-explorer/index.html', {root: __dirname});
});

app.get('/UTXOs', function (req, res){
	bitcoin.getUTXO();
	res.json({utxo : bitcoin.UTXO});
});


//error handling
app.use((req,res,next)=>{
	const error = new Error('Not found');
	error.status = 404;
	next(error);
})

app.use((error, req, res, next)=>{
	res.status(error.status||500).json({
		error:{
			message: error.message
		}
	})
})


app.listen(port, function(){
	console.log(`listening on port ${port}...`);
});