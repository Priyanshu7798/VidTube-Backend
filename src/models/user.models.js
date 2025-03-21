import mongoose ,{Schema} from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const userSchema = new Schema (
    {
      username: {
        type: String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true,
        index: true,
      },
      email: {
        type: String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true,
      },
      fullname: {
        type: String,
        required : true,
        index: true,
        trim : true,
      },
      avatar : {
        type: String,
        required: true,
      },
      coverImage : {
        type: String,
      },
      watchHistory : [
        {
            type: Schema.Types.ObjectId,
            ref : 'Video'
        }
      ],
      password : {
        type: String,
        unique: true,
        required : [ true, "Password is required"]
      },
      refreshTokens : {
        type: String
      }
    },
    { timestamps : true }
)

// Password Encrpytion
userSchema.pre('save', async function (next) {
  
  // When the pass word is not modified or save it will not encrypt
  if(!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 10);

  next()
})

// Password Decryption
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password)
}

// JWT tokens

userSchema.methods.generateAccessTokens = function() {
  // short lived tokens
  return jwt.sign({ 
      _id: this.id,
      email: this.email,
      username: this.username,
      fullname: this.fullname,

    }, 
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
  )
}

// Refresh Tokens
userSchema.methods.generateRefreshTokens = function () {
  return jwt.sign({
    _id: this.id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
  )
}


export const User = mongoose.model('User',userSchema);

 