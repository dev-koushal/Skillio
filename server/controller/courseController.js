import Course from "../models/coursesModel";


export const createCourse = async (req,res) => {
    try {
        const {title,category} = req.body
        if(!title || !category){
            return res.status(400).json({message:"All detail needed"})
        }

        const course = Course.create({
            title,
            category,
            creator:req.userId
        })
        return res.status(200).json(course)
    } catch (error) {
        console.log(error);
        return res.status(400).json({message:`createCourse error ${error}`})
    }
}

export const getPublishedCourses = async (req,res) => {
    try {
        const courses = await Course.find({isPublished:true})
        if(!courses){
            return res.status(400).json({message:"Courses not found"})
        }
        return res.status(200).json(courses)
    } catch (error) {
         return res.status(400).json({message:`failed in getting published courses ${error}`})
    }
}

export const getCreatorCourses = async (req,res) => {
    try {
        const userId = req.userId;
        const courses = await Course.find({creator:userId})
         if(!courses){
            return res.status(400).json({message:"Courses not found"})
        }
           return res.status(200).json(courses)
    } catch (error) {
         return res.status(400).json({message:`failed to get creator courses ${error}`})
    }
}

export const editCourse = async (req,res) => {
    try {
        const {courseId} = req.params
        const{title,subTitle,description,category,level,isPublished,price} = req.body
    } catch (error) {
        
    }
}