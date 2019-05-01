const sha256 = require('sha256');
const currentNodeUrl = process.argv[3];
const uuid = require('uuid/v1');
const merkle = require('merkle');

function BlockChain(){
	 this.chain = [];
	 this.pendingTransactions = [];
	 this.currentNodeUrl = currentNodeUrl;
	 this.networkNodes = [];
	 this.UTXO = [];
	 this.createNewBlock(0,'block','genesis');
}

BlockChain.prototype.createNewBlock = function(nonce, previousBlockHash, hash) {
	const merkleRoot = this.getMerkleRoot();

this.pendingTransactions.forEach(transactionObj=>{
	
	const dup = this.isNewTransactionId(this.UTXO,'transactionId', transactionObj.transactionId);
			if (dup)
this.UTXO.push({transactionId : transactionObj.transactionId,
			owner : transactionObj.recipient,
			availBalance : transactionObj.amount});});

	const newBlock = {
	index: this.chain.length + 1,
	// Changed for jquery // timestamp : Date.now(),
	timestamp : Date().toLocaleString(),
	transactions : this.pendingTransactions,
	nonce: nonce,
	merkleRoot : merkleRoot,
	hash : hash,
	previousBlockHash : previousBlockHash,
	};

this.pendingTransactions = [];
this.chain.push(newBlock);

return newBlock;
	
}

BlockChain.prototype.getLastBlock = function(){
	return this.chain[this.chain.length - 1];
}

BlockChain.prototype.createNewTransaction = function(amount, sender, recipient){
	const newTransaction = {
		amount : amount,
		sender : sender,
		recipient : recipient,
		transactionId: uuid().split('-').join('')
	};
return newTransaction;

}

BlockChain.prototype.addTransactionToPendingTransactions = function(transactionObj){
this.pendingTransactions.push(transactionObj);


return this.getLastBlock()['index'] + 1;
}

BlockChain.prototype.hashBlock = function(previousHash, currentBlockData, nonce){

	const dataAsString = previousHash + nonce.toString() + JSON.stringify(currentBlockData);
	const hash = sha256(dataAsString);

return hash;
}

BlockChain.prototype.proofOfWork = function(previousHash,currentBlockData){
	let nonce = 0;

	let hash = this.hashBlock(previousHash,currentBlockData,nonce);
	while (hash.substring(0,4) !== '0000'){
		nonce++;
		hash = this.hashBlock(previousHash,currentBlockData,nonce);
	}
return nonce;

};

BlockChain.prototype.chainIsValid = function(blockchain) {
	let validChain = true;

	for (var i = 1; i < blockchain.length; i++) {
		const currentBlock = blockchain[i];
		const prevBlock = blockchain[i - 1];
		const blockHash = this.hashBlock(prevBlock['hash'], { transactions: currentBlock['transactions'], index: currentBlock['index'] }, currentBlock['nonce']);
		if (blockHash.substring(0, 4) !== '0000') validChain = false;
		if (currentBlock['previousBlockHash'] !== prevBlock['hash']) validChain = false;
	};

	const genesisBlock = blockchain[0];
	const correctNonce = genesisBlock['nonce'] === 0;
	const correctPreviousBlockHash = genesisBlock['previousBlockHash'] === 'block';
	const correctHash = genesisBlock['hash'] === 'genesis';
	const correctTransactions = genesisBlock['transactions'].length === 0;

	if (!correctNonce || !correctPreviousBlockHash || !correctHash || !correctTransactions) validChain = false;

	return validChain;
};


BlockChain.prototype.getBlock = function(hashOrIndex) { //http://localhost:3001/block/0000219765fb79842b51403645ffa144131a7719fefe481eedd2f455417c86e3
	let correctBlock = null;
	this.chain.forEach(block =>{
if (block['hash'] == hashOrIndex|| block['index']==hashOrIndex)
	{correctBlock = block;
	}
});
return correctBlock;
};

BlockChain.prototype.getTransaction = function(transactionID) {
	let correctTransaction = null;
	let correctBlock = null;
	let foundTran = false;

	this.chain.forEach(block => {
		block.transactions.forEach(transaction =>{
				if (transaction.transactionId === transactionID)
					{correctTransaction = transaction;
				correctBlock = block;
				foundTran = true;
			};
		});
	});
return { 
	foundTran : foundTran,
	transaction : correctTransaction,
			block : correctBlock
			};
};


BlockChain.prototype.getAddressData = function(address){
const addressTransactions = [];
let balance = 0;
	this.chain.forEach(block =>{
block.transactions.forEach(transaction =>{
if (transaction.sender == address)
{
	addressTransactions.push(transaction);
	balance -= transaction.amount;
};
if (transaction.recipient == address)
{
addressTransactions.push(transaction);
balance += transaction.amount;
};
} );
	});
return {
	addressTransactions : addressTransactions,
	addressBalance : balance
};
};

BlockChain.prototype.updateUTXO = function(amount,owner){
	if (owner !== '00')
	{
	this.UTXO.forEach(transactionBlock=>{
	if(transactionBlock['owner'] == owner )
		{balance1 = transactionBlock['availBalance'] ;
		var transactionBalance = transactionBlock['availBalance'];
		if (amount <= transactionBlock['availBalance'] && amount >0){
			transactionBlock['availBalance'] -= amount;
			
			amount -=transactionBalance;
			if (amount < 0)
				amount = 0;
			//console.log(transactionBlock['owner'],owner);
			  //if(transactionBlock['availBalance']==0)
				 //this.UTXO.pop();
				}
				else if (amount >0)
				{
					amount -= transactionBlock['availBalance'];
					//console.log(transactionBlock['owner'],owner);
					transactionBlock['availBalance'] = 0;
							//if(transactionBlock['availBalance']==0)
				// this.UTXO.pop();
					
				}}
		});
}

this.cleanUpUTXO(this.UTXO,'availBalance',0);

};

BlockChain.prototype.cleanUpUTXO = function(array, key, value){
	for (var i=0; i<array.length; i++){
		while (array[i][key] === value) {
			array.splice(i,1);
		}
	}
}

BlockChain.prototype.isNewTransactionId = function(array, key, value){
  for (var i = array.length-1; i > 0; i--) {
            if (array[i][key] === value) {
                return false;
            }
        }
        return true;
    };


BlockChain.prototype.getUTXO = function(){
	return this.UTXO;
};


BlockChain.prototype.enoughBalance = function(amount,owner){
	var enoughBalance = false;
	var balance = 0, balance1 = 0;
	const originalAmount = amount;

this.UTXO.forEach(transactionBlock=>{
	
	if(transactionBlock['owner'] == owner)
		{balance += transactionBlock['availBalance'] ;
		if (balance >= amount)
				enoughBalance = true;}
		}
);

if (owner == '00')
enoughBalance=true;

return enoughBalance;

};



BlockChain.prototype.getMerkleRoot = function(){
	var transactionsHashes = [];
	for (var i=0; i<this.pendingTransactions.length; i++)
		{transactionsHashes.push(JSON.stringify(this.pendingTransactions[i]['transactionId']));}

var tree = merkle('sha256').sync(transactionsHashes);
const root = tree.root();

if(!root)
	return 'n/a';
else
return root;
};



module.exports = BlockChain;