import React, { useEffect, useState } from 'react';
import { CiCirclePlus } from 'react-icons/ci';
import { MdDelete,MdImage } from 'react-icons/md';
import { FaSave,FaTimes,FaSpinner } from 'react-icons/fa';
import bgimage from './assets/loginbg.png'
import { useParams } from 'react-router-dom';
import imageCompression from 'browser-image-compression';

const OP_MODE = {
    NORMAL : "normal",
    DUPLICATE : "duplicate",
    EDIT : "edit"
}

export default function NewQuiz() {
    const { mode } = useParams();
    const [quizTitle, setQuizTitle] = useState('Title here');
    const [questions, setQuestions] = useState([]);
    const [showDialog, setDialog] = useState();
    const [error, seterror] = useState('');
    const [code, setCode] = useState('');
    const [editCode,setEditCode] = useState('');
    const [questionsLoading,setQuestionsLoading] = useState(-1)

    useEffect(()=>{
        if(mode === OP_MODE.DUPLICATE){
            let oldquiz = JSON.parse(localStorage.getItem('duplicatedQuiz'))
            if(oldquiz){
                setQuizTitle(`${oldquiz.title} - Copy`)
                setQuestions(oldquiz.questions)
            }
        } else if ( mode === OP_MODE.EDIT ) {
            let oldquiz = JSON.parse(localStorage.getItem('editedQuiz'))
            if(!oldquiz){
                window.location.href = '/'
            } else {
                setQuizTitle(oldquiz.title)
                setQuestions(oldquiz.questions)
                setEditCode(oldquiz.code)
            }
        }
    },[mode])

    useEffect(() => {
        if (showDialog === 1) {
            document.getElementById('error_modal').showModal();
        }
        if (showDialog === 2) {
            document.getElementById('saved_modal').showModal();
        }
    }, [showDialog])

    const handleTitleChange = (e) => {
        setQuizTitle(e.target.value);
    };

    const handleAddQuestion = () => {
        setQuestions([
            ...questions,
            {
                questionText: '',
                options: ['', '', '', ''],
                correctIndex: 0,
                points: 1000,
                duration : 10
            },
        ]);
    };

    const handleSave = async () => {
        const questionsCopy = []
        for(let i=0;i<questions.length;i++){
            let question = questions[i];
            console.log('Question : ',question.questionText , ' img : ',question.questionImgUrl)
            if(!question.questionText && !question.questionImgUrl){
                continue
            }
            questionsCopy.push(question)
            if(question.duration > 60) { questionsCopy[i].duration = 60}
            if(question.duration < 5) { questionsCopy[i].duration = 5}
            if(question.points > 1000000){ questionsCopy[i].points = 1000000 }
            if(question.points < 50){ questionsCopy[i].points = 50 }
        }
        if(questionsCopy.length === 0){
            setDialog(1)
            seterror("Quiz is empty")
            return
        }
        let bodyData = {
            title: quizTitle,
            questions: questionsCopy
        }
        if(mode === OP_MODE.EDIT){ 
            bodyData.quizCode = editCode
        }
        const response = await fetch(`${process.env.REACT_APP_API_URL}/quiz/${mode === OP_MODE.EDIT?'edit':'create'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authorization': localStorage.getItem('user')
            },
            body: JSON.stringify(bodyData)
        })
        const data = await response.json();
        console.log(data)
        if (data.error) {
            setDialog(1);
            seterror(data.message);
        } else {
            setDialog(2);
            setCode(data.quiz.code)
        }
    }

    const handleUpdatePoints = (index, value) => {
        const updatedQuestions = [...questions];
        updatedQuestions[index].points = value;
        setQuestions(updatedQuestions);
    };

    const handleUpdateDuration = (index, value) => {
        const updatedQuestions = [...questions];
        updatedQuestions[index].duration = value;
        setQuestions(updatedQuestions);
    };

    const handleOptionchange = (questionIndex,optionIndex,value)=>{
        const updatedQuestions = [...questions];
        updatedQuestions[questionIndex].options[optionIndex] = value;
        setQuestions(updatedQuestions)
    }
    const handleRadioChange = (questionIndex, optionIndex) => {
        const updatedQuestions = [...questions];
        updatedQuestions[questionIndex].correctIndex = optionIndex;
        setQuestions(updatedQuestions);
    };

    const handleQuestionDel = (index) => {
        const updatedQuestions = [...questions];
        updatedQuestions.splice(index, 1);
        setQuestions(updatedQuestions);
    };
    const handleQuestionTitleChange = (index, value) => {
        const updatedQuestions = [...questions]
        updatedQuestions[index].questionText = value;
        setQuestions(updatedQuestions);
    }

    useEffect(()=>{
        document.querySelector('body').style.backgroundImage = `url(${bgimage})`
        document.querySelector('body').style.minHeight = `100vh`
    },[])

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    
    useEffect(() => {
        const handleResize = () => {
          setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        document.body.style.minHeight = '100vh'
        return () => {
          window.removeEventListener('resize', handleResize);
        };
    },[]);

    useEffect(()=>{
        const handleBeforeUnload = (event) => {
            if(code){ return; }
            event.preventDefault();
            try {
                console.log('confirming')
                const message = 'Confirm resubmission: You will lose all the data if you refresh.';
                event.returnValue = message; // Gecko, Trident, Chrome 34+
                return message; // Gecko, WebKit, Chrome <34
            } catch(err){
                console.log(err)
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    },[code])

    const handleImageUpload = async (questionIndex, file,e) => {
        console.log('changed')
        if(!file){ return }
        let imageCompressed = false
        if (file.size > 4 * 1024 * 1024) { // Check if the file size exceeds 50KB
          alert('File size should be less than 4mb');
          return;
        } else if(file.size <= 100 * 1024){
            console.log("Already compressed image")
            imageCompressed = true
        } else {
            console.log('originalFile instanceof Blob', file instanceof Blob); // true
            console.log(`originalFile size ${file.size / 1024 } KB`);
            const options = {
                maxSizeMB: (1/1024)*(file.size > 500 * 1024 ?200:100),
                maxWidthOrHeight: 1920,
                useWebWorker: true,
              }
              try {
                setQuestionsLoading(questionIndex)
                const compressedFile = await imageCompression(file, options);
                console.log('compressedFile instanceof Blob', compressedFile instanceof Blob); // true
                console.log(`compressedFile size ${compressedFile.size / 1024 } KB`); // smaller than maxSizeMB
                imageCompressed = true
                file = compressedFile
              } catch (error) {
                imageCompressed = false
                console.log(error);
                setQuestionsLoading(-1)
              }
        }
        if(!imageCompressed){
            alert('There was some error while compressing the image, try uploading image of less than 100KB')
            return
        }
        console.log('Uploading image',file)
        setQuestionsLoading(questionIndex)

        // if there is a previosly then after this request , give a call to delete it from server
        if(questions[questionIndex].questionImgUrl){
            removeImage(questionIndex)
        }
      
        // Implement the image upload functionality here
        // For example, upload the image to your server and get the image URL
        const imageUrl = await uploadImageToServer(file);
        console.log(imageUrl)
      
        // Update the question object with the image URL
        const updatedQuestions = [...questions];
        updatedQuestions[questionIndex].questionImgUrl = imageUrl;
        setQuestions(updatedQuestions);
        setQuestionsLoading(-1)
    };

    const uploadImageToServer = async (file) => {
        try {
            const formData = new FormData();
            formData.append('image', file);
            const response = await fetch(`${process.env.REACT_APP_API_URL}/uploadImg`, {
                method: 'POST',
                headers: {
                    // 'Content-Type': 'multipart/form-data', DONT UNCOMMENT
                    'authorization': localStorage.getItem('user')
                },
                body: formData
            })
            const data = await response.json()
            if(data.error){
                console.log(data);
                alert('Image upload failed')
                return ''
            }
            return data.imageUrl
        } catch (err){
            console.log(err)
            return ''
        }
    }

    const removeImage = (questionIndex) => {
        if(!questions[questionIndex].questionImgUrl){ return }
        let imgUrl = questions[questionIndex].questionImgUrl
        const updatedQuestions = [...questions];
        updatedQuestions[questionIndex].questionImgUrl = '';
        setQuestions(updatedQuestions);

        // delete that image url from the drive
        fetch(`${process.env.REACT_APP_API_URL}/deleteImg`,{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authorization': localStorage.getItem('user')
            },
            body: JSON.stringify({ imgUrl })  
        })
    }

    return (
        <div className="flex items-center flex-col mx-2">
            {showDialog === 1 ? <div>
                <dialog id="error_modal" className="modal modal-bottom sm:modal-middle">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg text-error">Error</h3>
                        <p className="py-4">{error}</p>
                        <div className="modal-action">
                            <form method="dialog">
                                {/* if there is a button in form, it will close the modal */}
                                <button className="btn">Close</button>
                            </form>
                        </div>
                    </div>
                </dialog>
            </div> : <></>}
            {showDialog === 2 ? <div>
                <dialog id="saved_modal" className="modal modal-bottom sm:modal-middle">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg text-error">Quiz saved</h3>
                        <p className="py-4">{window.location.href.slice(0, -7 - (mode.length)) + 'quiz/' + code}</p>
                        <button className='btn btn-primary' onClick={() => {
                            navigator.clipboard.writeText(window.location.href.slice(0, -7 - (mode.length)) + 'quiz/' + code)
                        }}>
                            Copy
                        </button>
                        <div className="modal-action">
                            <form method="dialog">
                                {/* if there is a button in form, it will close the modal */}
                                <button className="btn" onClick={()=>{
                                    console.log('clicked')
                                    window.location.href = '/'
                                }}>Close</button>
                            </form>
                        </div>
                    </div>
                </dialog>
            </div> : <></>}
            <input
                type="text"
                placeholder="Type here"
                className="input input-bordered w-full max-w-xs"
                value={quizTitle}
                onChange={handleTitleChange}
            />
            {questions.map((question, questionIndex) => (
                <div className={`card ${isMobile?'w-full':'w-96'} bg-base-100  my-10 shadow-xl`} key={questionIndex}>
                    <div className="card-body">
                        <div className="flex items-center">
                            <textarea placeholder={`Question ${questionIndex + 1}`} className="textarea textarea-bordered textarea-md w-full max-w-xs" value={question.questionText} style={{
                                resize: 'none'
                            }} onChange={(e) => {
                                handleQuestionTitleChange(questionIndex, e.target.value);
                            }}></textarea>
                            <div className='flex flex-col justify-center'>
                                <button className="btn btn-error btn-xs ml-2 my-2" onClick={() => handleQuestionDel(questionIndex)}>
                                    <MdDelete style={{ fontSize: '1.2rem' }} />
                                </button>
                                <label className="btn btn-outline btn-xs ml-2">
                                <MdImage style={{ fontSize: '1.2rem' }} />
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={(e) => {
                                            console.log('Image changed')
                                            handleImageUpload(questionIndex, e.target.files[0],e)
                                        }} 
                                    />
                                </label>
                            </div>
                        </div>
                        {question.questionImgUrl && <div className="mb-2 flex flex-row">
                            <a href={question.questionImgUrl} target="_blank" rel="noopener noreferrer" className="block text-blue-500 text-xs underline">
                                Uploaded Image</a>
                                <span className='ml-4'><FaTimes color='red' className=' hover:cursor-pointer' onClick={()=> {removeImage(questionIndex)}}></FaTimes></span>
                        </div>}
                        {!question.questionImgUrl && questionsLoading === questionIndex && <span className='ml-auto'><FaSpinner className=' animate-spin'></FaSpinner></span>}
                        {question.options.map((option, optionIndex) => (
                            <div className={`form-control ${optionIndex === question.correctIndex?' bg-lime-200':''}`} key={optionIndex}>
                                <label className="cursor-pointer label">
                                    <input className={`label-text px-2 ${optionIndex === question.correctIndex?' bg-lime-200':''}`} placeholder={`option ${optionIndex + 1}`} value={option} onChange={(e)=>{
                                        handleOptionchange(questionIndex,optionIndex,e.target.value)
                                    }}/>
                                    <input
                                        className="label-text px-2 radio"
                                        value={option}
                                        type="radio"
                                        name={`question-${questionIndex}`}
                                        checked={question.correctIndex === optionIndex}
                                        onChange={() => handleRadioChange(questionIndex, optionIndex)}
                                    />

                                </label>
                            </div>
                        ))}
                        <div className='flex flex-row justify-center'>
                            <div className="form-control flex items-center">
                                <label className="label inline-block w-20 mr-2">{`Points`}</label>
                                <input
                                    type="number"
                                    className="input input-bordered w-full max-w-xs"
                                    value={question.points}
                                    onChange={(e) => handleUpdatePoints(questionIndex, e.target.value)}
                                    step={`50`}
                                    min="50"
                                    max="10000000"
                                />
                            </div>
                            <div className="form-control flex items-center">
                                <label className="label inline-block w-20 mr-2">{`Time (s)`}</label>
                                <input
                                    type='number'
                                    className="input input-bordered w-full max-w-xs"
                                    value={question.duration}
                                    onChange={(e) => handleUpdateDuration(questionIndex, e.target.value)}
                                    step={`5`}
                                    min="5"
                                    max={`60`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            <button className="btn btn-success" onClick={handleAddQuestion}>
                <CiCirclePlus />
                Add Question
            </button>
            <button className={"btn btn-secondary mx-10 my-10 "} onClick={handleSave}>
                <FaSave />
                {mode === OP_MODE.EDIT ? 'Save changes' : 'Save'}
            </button>
        </div>
    );
}
