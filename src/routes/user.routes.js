import {Router} from 'express'
import { 
registerUser,
logoutUser,
loginUser,
refreshAccessToken,
changeCurrentPassowrd,
getCurrentUser,
updateAccountDetails,
changeUserAvatar,
changeUserCoverImage,
getUserChannelProfile,
getUserWatchHistory,
} 
from '../controllers/user.controllers.js'
import {upload} from '../middlewares/multer.middleware.js'
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();
console.log(registerUser)


// unsecured Routes
router.route('/register').post(

    upload.fields([
        {
            name: 'avatar',
            maxCount : 1
        },{
            name: 'coverImage',
            maxCount : 1
        }
    ]),
registerUser)
router.route('/login').post(loginUser);
router.route('/refreshTokens').post(refreshAccessToken);

// secured routes

router.route('/logout').post(verifyJWT,logoutUser);
router.route('/change-password').post(verifyJWT, changeCurrentPassowrd);
router.route('/current-user').get(verifyJWT, getCurrentUser);
router.route('/update-account').patch(verifyJWT, updateAccountDetails);
router.route('/avatr').patch(verifyJWT,upload.single("avatar"),changeUserAvatar);
router.route('/cover-image').patch(verifyJWT,upload.single("coverImage"),changeUserCoverImage);

// now accessing the file

router.route('/c/:userName').get(verifyJWT,getUserChannelProfile);
router.route('/c/history').get(verifyJWT,getUserWatchHistory)

export default router
