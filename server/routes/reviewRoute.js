import express from 'express'
import { createReview, getReviews } from '../controller/reviewContoller.js'
import isAuth from '../middleware/isAuth.js'

const reviewRouter = express.Router()

reviewRouter.post("/create-review",isAuth,createReview)
reviewRouter.get("/getreview",getReviews)

export default reviewRouter