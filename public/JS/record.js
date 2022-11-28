if (!window.AudioContext) {
    setMessage(
        "Your browser does not support window.Audiocontext. This is needed for this demo to work. Please try again in a differen browser.");

}

// UI Elements
const canvas = document.querySelector(".visualizer");
const canvas2 = document.querySelector("#canvas2wrapper .visualizer");
const canvas2wrapper = document.querySelector("#canvas2wrapper");
const audioPlayer = document.querySelector(".audio");

let audioContext, scriptProcessor, analyser, playerInterval;

// Constants
const chunks = [];

// Variables
let input = null;
let recorder = null;
let recording = null;
let isRecording = false;
let isRecorded = false;
let isPlaying = false;

// Canvas variables
const barColor = "#49F1D5";
let canvasContext = canvas.getContext("2d");
let canvas2Context = canvas2.getContext("2d");
let width = 0;
let height = 0;
let progress = 0;
let halfHeight = 0;
let drawing = false;

// Request access to the user's microphone.
if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(
        stream => {
            setAudioStream(stream);
        },
        error => {
            console.log(error)
        });
}

// Set all variables which needed the audio stream
const setAudioStream = stream => {
    stream = stream;
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    analyser = audioContext.createAnalyser();
    scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
    // Setup analyser node
    analyser.smoothingTimeConstant = 0.3;
    analyser.fftSize = 1024;


    input = audioContext.createMediaStreamSource(stream);
    let options = {
        audioBitsPerSecond : 6400,
    }
    recorder = new window.MediaRecorder(stream, options);

    // Save chunks of the incomming audio to the chuncks array
    recorder.ondataavailable = (event) => {
    chunks.push(event.data);
    };

    recorder.onstop = saveRecording;
    
    setupWaveform();
};



// Save the recording
const saveRecording = () => {
    recording = URL.createObjectURL(new Blob(chunks, { type: "audio/mp3" }));
    audioPlayer.setAttribute("src", recording);

    setTimeout(() => {
        renderBars();
    }, 20);
    chunks.length = 0;
};

// Start recording
const startRecording = () => {
    isRecorded = false;
    isRecording = true;
    progress = 0;
    canvas2wrapper.setAttribute("style", "width:100%")

    if(isPlaying){
        stopAudio();
    }
    recorder.start();

    if(isWakeword){
        setTimeout(() => {
            stopRecording();
        }, 1100);
    }
};

// Stop recording
const stopRecording = () => {
    isRecorded = true;
    isRecording = false;
    recorder.stop();
};

// Toggle the recording button
const toggleRecording = () => {
    if (isRecording & !isWakeword) {
        stopRecording();
    } else if(!isRecording) {
        startRecording();
    }
};

// Setup the canvas to draw the waveform
const setupWaveform = () => {

    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    halfHeight = canvas.offsetHeight / 2;

    canvasContext.canvas.width = width;
    canvasContext.canvas.height = height;
    canvas2Context.canvas.width = width;
    canvas2Context.canvas.height = height;

    input.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);
    scriptProcessor.onaudioprocess = processInput;
};

// Process the microphone input
const processInput = audioProcessingEvent => {
    const bufferLength = analyser.frequencyBinCount;
    const array = new Uint8Array(analyser.frequencyBinCount);
    if (!isRecorded) {
        renderPath(bufferLength, array)
    }
};

// Render the bars
const renderBars = () => {
    if (!drawing) {
        drawing = true;

        fetch(recording).then(response => response.arrayBuffer())
            .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer)).then(audioBuffer => filterData(audioBuffer))
            .then(filterBuffer => {
                window.requestAnimationFrame(() => {
                    canvasContext.clearRect(0, 0, width, height);
                    canvasContext.strokeStyle = "#555655";
                    canvasContext.lineWidth = 2;
                    canvasContext.beginPath()

                    canvas2Context.clearRect(0, 0, width, height);
                    canvas2Context.strokeStyle = barColor;
                    canvas2Context.lineWidth = 2;
                    canvas2Context.beginPath()

                    for (let i = 0; i < filterBuffer.length; i++) {

                        const x = 4 * i;
                        let y = filterBuffer[i] * halfHeight;
                        if (y < 0.5) {
                            y = 0.5;
                        } else if (y > halfHeight) {
                            y = halfHeight;
                        }
                        canvasContext.moveTo(x, halfHeight - y);
                        canvasContext.lineTo(x, halfHeight + y);
                        canvas2Context.moveTo(x, halfHeight - y);
                        canvas2Context.lineTo(x, halfHeight + y);
                    };
                    canvasContext.stroke();
                    canvas2Context.stroke();

                });
            });
        drawing = false;
    }
};

// normalize the audio for rendering bars
const filterData = audioBuffer => {
    const rawData = audioBuffer.getChannelData(0);
    const samples = Math.round(width / 4);
    const blockSize = Math.floor(rawData.length / samples);
    const filteredData = [];
    for (let i = 0; i < samples; i++) {
        let blockStart = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
            sum = sum + Math.abs(rawData[blockStart + j])
        }
        filteredData.push(sum / blockSize);
    }
    const multiplier = Math.pow((Math.max(...filteredData) + 0.5) / 2, -1);
    return filteredData.map(n => n * multiplier);
}


// Render the Path
const renderPath = (bufferLength, array) => {
    if (!drawing) {
        drawing = true;

        window.requestAnimationFrame(() => {
            analyser.getByteTimeDomainData(array);
            canvasContext.clearRect(0, 0, width, height);
            canvas2Context.clearRect(0, 0, width, height);

            canvasContext.fillStyle = 'rgba(0,0,0,0)';
            canvasContext.fillRect(0, 0, width, height);
            canvasContext.lineWidth = 2;
            canvasContext.strokeStyle = barColor;

            canvasContext.beginPath();
            let sliceWidth = width * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {

                let v = array[i] / 128.0;
                let y = v * height / 2;

                if (i === 0) {
                    canvasContext.moveTo(x, y);
                } else {
                    canvasContext.lineTo(x, y);
                }

                x += sliceWidth;

            }
            canvasContext.lineTo(canvas.width, canvas.height / 2);
            canvasContext.stroke();

            drawing = false;
        });
    }
};

// initialize audioPlayer to avoid getting Infinity duration
audioPlayer.addEventListener('loadedmetadata', function () {
    if (audioPlayer.duration == Infinity) {
        audioPlayer.currentTime = 1e101;
        audioPlayer.ontimeupdate = function () {
            this.ontimeupdate = null;
            displayAudioDuration(audioPlayer.duration);
            audioPlayer.currentTime = 0;
            return;
        }
    }
})

// Play the recording
const play = () => {
    isPlaying = true;
    var duration = (audioPlayer.duration) * 1000;
    var interval = 10;
    var increment = (100 * interval) / duration;

    playerInterval = setInterval(() => {
        progress += increment;
        if (progress > 100 || !isPlaying) {
            progress = 100
        }
        canvas2wrapper.setAttribute("style", "width:" + progress + "%")
    }, interval)

    audioPlayer.play();
};


//Seek the recording
const seeking = (e) =>{
    if(!isRecorded){
        return
    }
    var eleBounds = e.target.getBoundingClientRect()
    var rightBound = eleBounds.right;
    var leftBound = eleBounds.left;
    progress = ((e.clientX - leftBound) * 100) / (rightBound - leftBound)
    audioPlayer.currentTime = audioPlayer.duration * progress / 100
    canvas2wrapper.setAttribute("style", "width:" + progress + "%")
}
canvas.addEventListener("click", seeking)

// Pause the recording
const pauseAudio = () => {
    clearInterval(playerInterval)
    isPlaying = false;
    audioPlayer.pause();
};

// Stop the recording
const stopAudio = () => {
    progress = 0;
    pauseAudio();
};

// Toggle the play button
const togglePlay = () => {
    if (isPlaying) {
        pauseAudio();
    } else {
        play();
    }
};

// Setup the audio player
audioPlayer.addEventListener("ended", stopAudio)



// if audio file is uploaded
let file;
document.querySelector("#file").addEventListener("change", function (e) {
    isRecorded = true;
    file = this.files[0]
    audioPlayer.src = URL.createObjectURL(file)
    this.files[0].arrayBuffer().then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer)).then(audioBuffer => filterData(audioBuffer))
        .then(filterBuffer => {
            window.requestAnimationFrame(() => {
                canvasContext.clearRect(0, 0, width, height);
                canvasContext.strokeStyle = "#555655";
                canvasContext.lineWidth = 2;
                canvasContext.beginPath()

                canvas2Context.clearRect(0, 0, width, height);
                canvas2Context.strokeStyle = barColor;
                canvas2Context.lineWidth = 2;
                canvas2Context.beginPath()

                for (let i = 0; i < filterBuffer.length; i++) {

                    const x = 4 * i;
                    let y = filterBuffer[i] * halfHeight;
                    if (y < 0.5) {
                        y = 0.5;
                    } else if (y > halfHeight) {
                        y = halfHeight;
                    }
                    canvasContext.moveTo(x, halfHeight - y);
                    canvasContext.lineTo(x, halfHeight + y);
                    canvas2Context.moveTo(x, halfHeight - y);
                    canvas2Context.lineTo(x, halfHeight + y);
                };
                canvasContext.stroke();
                canvas2Context.stroke();

            });
        });
})


// adjust the canvas size when window is resized
window.onresize = () => {
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    halfHeight = canvas.offsetHeight / 2;
    canvas2.setAttribute("style", "width:" + width + "px");
}


document.addEventListener('keydown', (event) => {
    var code = event.code;
    if(code == "KeyR"){
        toggleRecording();
    }

    if(code == "Space" && isRecorded){
        togglePlay();
    }

    if(code == "KeyN"){
        alert(`Key pressed ${name} \r\n Key code value: ${code}`);
    }
  }, false);