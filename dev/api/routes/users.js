const express = require('express')
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookie=require('cookie');


const User = require('../models/user');


router.post('/signup', (req, res, next)=>{
	User.find({email:req.body.email})
	.exec()
	.then(user=>{
		if(user.length>=1){
			return res.status(409).json({
				message: 'User already exists'
			});
		}else{
			bcrypt.hash(req.body.password,10, (err,hash)=>{
				if(err){
					return res.status(500).json({
						error : err
					})
				}else{
					const user = new User({
						_id: new mongoose.Types.ObjectId(),
						email: req.body.email,
						password: hash
					});
					user.save().then(result=>{
						console.log(result)
						res.status(201).json({
							message : 'User Created'
						})
					})
					.catch(err=>{
						res.status(500).json({
							error:err
						})
					});
				}
			})

		}
	})
});

router.post('/login',(req, res, next)=>{
	User.find({email:req.body.email}) //this should got back an array, but only one item in it this this case
	.exec()
	.then(users=>{
		if(users.length<1){
			return res.status(401).json({
				message : 'Authorization failed'
			})
		}
		bcrypt.compare(req.body.password, users[0].password, (err, result)=>{
			if(err){
				return res.status(401).json({
				message : 'Authorization failed'
			})
			}
			if(result){
					const token = jwt.sign({
						email: users[0].email,
						userId : users[0]._id
					}, 
					process.env.JWT_KEY,
					{
						expiresIn: '1h'
					}
					)

					//return res.status(200).cookie('accessToken', token);

				return res.status(200).json({
					message : 'Login successed',
					token : token
				})


			}
			return res.status(401).json({
				message : 'Login failed'

			})

		})
	})
	.catch(err=>{
		res.status(500).json({
			error:err
		})
	})
})



router.get('/', (req, res, next)=>{
User.find()
.exec()
.then(docs=>{
	const response = {
		count : docs.length,
		users : docs.map(doc=>{
		return {
			id: doc._id,
			email : doc.email
		}
	})
	}
		res.status(200).json(response);
	
})
.catch(err=>{
	res.status(500).json({
		error:err
	})
});


})



router.delete('/:email', (req, res, next)=>{
	//to use id to delete,  :userId  {_id:req.params.id}
	User.deleteOne({email : req.params.email}).exec() 
	.then(result=>{
		res.status(200).json({
			message:'User deleted'
		})
	})
	.catch(err=>{
		res.status(500).json({
			error:err
		})
	});
})


module.exports = router;