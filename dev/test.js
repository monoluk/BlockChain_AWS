const Blockchain = require('./Blockchain');
const uuid = require('uuid/v1');
const nodeAddress = uuid().split('-').join('');
var merkle = require('merkle');

const bitcoin = new Blockchain;

// 	const lastBlock = bitcoin.getLastBlock();
// 	const currentBlockData = {
// 		transactions : bitcoin.pendingTransactions,
// 		index : lastBlock['index'] + 1
// 	};
	
// 	const previousHash = lastBlock['hash'];
// 	const nonce = bitcoin.proofOfWork(previousHash, currentBlockData);
// 	const hash = bitcoin.hashBlock(previousHash,currentBlockData,nonce);
// 	bitcoin.createNewTransaction(12.5,"00", nodeAddress);
// const newBlock = bitcoin.createNewBlock(nonce, previousHash,hash);

// // res.json({note : "New block mined successfully",
// // 		block : newBlock}) ;

// console.log(bitcoin.chain[1]);





const transactionsHash = ['abc', 'def', 'hgi'];

 //merkle.addLeaves(transactionsHash, true);
 
//var tree = merkle('sha256').sync(transactionsHash);
var merkleRoot = bitcoin.getMerkleRoot(transactionsHash);


console.log('merkleRoot: ', merkleRoot);