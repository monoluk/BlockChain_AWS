const express = require('express')
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/order');
const Product = require('../models/product');


router.get('/',(req, res, next)=>{
	Order.find()
	.select('-__v')
	.populate('product','-__v') //print everything inside the 'product'(line19) property
	.exec()
	.then(docs=>{
		const responses = {
			count : docs.length,
			products : docs.map(doc=>{
				return{
				orderId : doc._id,
				productDetails : doc.product,
				quantity : doc.quantity
			}
			})
		}
		res.status(200).json(responses);
	})
	.catch(err=>{
		res.status(500).json({
			error:err
		})
	});
})

router.post('/', (req, res, next)=>{
	Product.findById(req.body.productId)
	.then(product=>{
				const order = new Order({
			_id: mongoose.Types.ObjectId(),
			product: req.body.productId,
			quantity: req.body.quantity	
		})
				return order.save();
			})
				.then(result=>{
			res.status(201).json({
				message : 'Order was created.',
				orderId : result._id,
				productId : result.product,
				quantity : result.quantity
			})
		})
			.catch(err =>{
			res.status(500).json({
				error:err
			})
		});
	})



router.get('/:orderId', (req, res, next)=>{
Order.findById(req.params.orderId)
.select('-__v')
.populate('product','-__v')
.exec()
.then(order=>{
	if(!order){
		res.status(404).json({
			message:'Order not found'
		})
	}

	res.status(200).json({
		order:order,
		request:{
			type:'GET',
			url : 'http://localhost:3000/products/'+ order.product._id
		}
	})
})
.catch(err=>{
	res.status(500).json({
		error:err
	})
})
})

router.delete('/:orderId', (req, res, next)=>{
 Order.remove({_id: req.params.orderId})
 .exec()
 .then(result=>{
 	if(!result.n){
 		res.status(404).json({
 			message: 'Order not found'
 		})
 	}

 	res.status(200).json({
 		message : 'Order below deleted',
 		result: result
 	})
 })
 .catch(err=>{
 	res.status(500).json({
 		error: err
 	})
 })
})

module.exports = router;



