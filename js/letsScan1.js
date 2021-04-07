const demosSection = document.getElementById('demos');

const MODEL_FILE_URL = 'models/Graph/model.json';

// Keep a reference of all the child elements we create
// so we can remove them easilly on each render.
const children = [];
const video = document.getElementById('webcam');
const liveView = document.getElementById('liveVilet');
let model = null;


tf.loadGraphModel(MODEL_FILE_URL).then(function(loadedModel) {
    model = loadedModel;

    // If webcam supported, add event listener to button for when user
    // wants to activate it.
    if (hasGetUserMedia()) {
        const enableWebcamButton = document.getElementById('webcamButton');
        enableWebcamButton.addEventListener('click', enableCam);
    } else {
        console.warn('getUserMedia() is not supported by your browser');
    }

    demosSection.classList.remove('invisible');
});

// Check if webcam access is supported.
function hasGetUserMedia() {
    return !!(navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia);
}

// Enable the live webcam view and start classification.
function enableCam(event) {
    if (!model) {
        console.log('Wait! Model not loaded yet.')
        return;
    }

    // Hide the button.
    event.target.classList.add('removed');

    // getUsermedia parameters.
    const constraints = {
        video: true
    };

    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        video.srcObject = stream;
        video.addEventListener('loadeddata', predictWebcam);
    });
}


function predictWebcam() {
    const videoTrack = video.srcObject.getVideoTracks()[0];
    let imageCapture = new ImageCapture(videoTrack);
    imageCapture.takePhoto().then(function(img) {
        console.log(img);
        // Now let's start classifying the stream.
        model.executeAsync(img.arrayBuffer()).then(function(predictions) {
            // Remove any highlighting we did previous frame.
            for (let i = 0; i < children.length; i++) {
                liveView.removeChild(children[i]);
            }
            children.splice(0);

            // Now lets loop through predictions and draw them to the live view if
            // they have a high confidence score.
            for (let n = 0; n < predictions.length; n++) {
                // If we are over 66% sure we are sure we classified it right, draw it!
                if (predictions[n].score > 0.66) {
                    const p = document.createElement('p');
                    p.innerText = predictions[n].class + ' - with ' +
                        Math.round(parseFloat(predictions[n].score) * 100) +
                        '% confidence.';
                    // Draw in top left of bounding box outline.
                    p.style = 'left: ' + predictions[n].bbox[0] + 'px;' +
                        'top: ' + predictions[n].bbox[1] + 'px;' +
                        'width: ' + (predictions[n].bbox[2] - 10) + 'px;';

                    // Draw the actual bounding box.
                    const highlighter = document.createElement('div');
                    highlighter.setAttribute('class', 'highlighter');
                    highlighter.style = 'left: ' + predictions[n].bbox[0] + 'px; top: ' +
                        predictions[n].bbox[1] + 'px; width: ' +
                        predictions[n].bbox[2] + 'px; height: ' +
                        predictions[n].bbox[3] + 'px;';

                    liveView.appendChild(highlighter);
                    liveView.appendChild(p);

                    // Store drawn objects in memory so we can delete them next time around.
                    children.push(highlighter);
                    children.push(p);
                }
            }

            // Call this function again to keep predicting when the browser is ready.
            window.requestAnimationFrame(predictWebcam);
        });
    })



}