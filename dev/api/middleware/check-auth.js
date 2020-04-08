const jwt = require('jsonwebtoken');


module.exports = (req, res, next)=>{
	try{
		//const token = req.headers.authorization.split(" ")[1];
		const token = req.headers.authorization;
		//const token = req.cookies.access_token;

		//const token = req.cookies.accessToken;

const decoded = jwt.verify(token, process.env.JWT_KEY);
req.userData = decoded;
next();
}catch(error){
	return res.status(401).json({
		message : 'Login failed'
	});
}

};

