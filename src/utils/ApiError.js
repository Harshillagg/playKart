//to format the error got from server
class ApiError extends Error {
    constructor(
        statusCode,
        message = "Someting went wrong",
        errors = [],
        stack = ""
    ){
        //to overwrite properties of parent call super first then add own properties
        super(message)
        this.statusCode = statusCode
        this.message = message
        this.errors = errors
        this.data = null
        this.success = false;

        if(stack){
            this.stack = stack
        }else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export default ApiError