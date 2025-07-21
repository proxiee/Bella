// Import pipeline from Transformers.js
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';

document.addEventListener('DOMContentLoaded', function() {

    // --- Loading Screen Handling ---
    const loadingScreen = document.getElementById('loading-screen');
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        // Hide after animation to avoid blocking interaction
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500); // Should match CSS transition time
    }, 1500); // Fade out after 1.5s
    
    // Get required DOM elements
    let video1 = document.getElementById('video1');
    let video2 = document.getElementById('video2');
    const micButton = document.getElementById('mic-button');
    const favorabilityBar = document.getElementById('favorability-bar');
    const floatingButton = document.getElementById('floating-button');
    const menuContainer = document.getElementById('menu-container');
    const menuItems = document.querySelectorAll('.menu-item');

    // --- Sentiment Analysis Elements ---
    const sentimentInput = document.getElementById('sentiment-input');
    const analyzeButton = document.getElementById('analyze-button');
    const sentimentResult = document.getElementById('sentiment-result');

    let activeVideo = video1;
    let inactiveVideo = video2;

    // Video list
    const videoList = [
        '视频资源/3D 建模图片制作.mp4',
        '视频资源/jimeng-2025-07-16-1043-笑着优雅的左右摇晃，过一会儿手扶着下巴，保持微笑.mp4',
        '视频资源/jimeng-2025-07-16-4437-比耶，然后微笑着优雅的左右摇晃.mp4',
        '视频资源/生成加油视频.mp4',
        '视频资源/生成跳舞视频.mp4',
        '视频资源/负面/jimeng-2025-07-16-9418-双手叉腰，嘴巴一直在嘟囔，表情微微生气.mp4'
    ];

    // --- Video crossfade switching ---
    function switchVideo() {
        // 1. Pick next video
        const currentVideoSrc = activeVideo.querySelector('source').getAttribute('src');
        let nextVideoSrc = currentVideoSrc;
        while (nextVideoSrc === currentVideoSrc) {
            const randomIndex = Math.floor(Math.random() * videoList.length);
            nextVideoSrc = videoList[randomIndex];
        }

        // 2. Set source for inactive video element
        inactiveVideo.querySelector('source').setAttribute('src', nextVideoSrc);
        inactiveVideo.load();

        // 3. When ready, switch
        inactiveVideo.addEventListener('canplaythrough', function onCanPlayThrough() {
            inactiveVideo.removeEventListener('canplaythrough', onCanPlayThrough);
            inactiveVideo.play().catch(error => {
                console.error("Video play failed:", error);
            });
            activeVideo.classList.remove('active');
            inactiveVideo.classList.add('active');
            [activeVideo, inactiveVideo] = [inactiveVideo, activeVideo];
            activeVideo.addEventListener('ended', switchVideo, { once: true });
        }, { once: true });
    }

    // Initial start
    activeVideo.addEventListener('ended', switchVideo, { once: true });

    // --- Speech Recognition Core ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    // Check browser support
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.lang = 'en-US'; // Set to English
        recognition.interimResults = true;

        recognition.onresult = (event) => {
            const transcriptContainer = document.getElementById('transcript');
            let final_transcript = '';
            let interim_transcript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final_transcript += event.results[i][0].transcript;
                } else {
                    interim_transcript += event.results[i][0].transcript;
                }
            }
            
            // Show result
            transcriptContainer.textContent = final_transcript || interim_transcript;
            
            // Sentiment analysis and video switching
            if (final_transcript) {
                analyzeAndReact(final_transcript);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
        };

    } else {
        console.log('Your browser does not support speech recognition.');
        // Optionally show a message in the UI
    }

    // --- Microphone button interaction ---
    let isListening = false;

    micButton.addEventListener('click', function() {
        if (!SpeechRecognition) return;

        isListening = !isListening;
        micButton.classList.toggle('is-listening', isListening);
        const transcriptContainer = document.querySelector('.transcript-container');
        const transcriptText = document.getElementById('transcript');

        if (isListening) {
            transcriptText.textContent = 'Listening...';
            transcriptContainer.classList.add('visible');
            recognition.start();
        } else {
            recognition.stop();
            transcriptContainer.classList.remove('visible');
            transcriptText.textContent = '';
        }
    });

    // --- Floating button interaction ---
    floatingButton.addEventListener('click', (event) => {
        event.stopPropagation();
        menuContainer.classList.toggle('hidden');
    });

    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const videoSrc = this.getAttribute('data-video');
            playSpecificVideo(videoSrc);
            menuContainer.classList.add('hidden');
        });
    });

    // Click outside menu to close
    document.addEventListener('click', () => {
        if (!menuContainer.classList.contains('hidden')) {
            menuContainer.classList.add('hidden');
        }
    });

    // Prevent menu click bubbling
    menuContainer.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    function playSpecificVideo(videoSrc) {
        const currentVideoSrc = activeVideo.querySelector('source').getAttribute('src');
        if (videoSrc === currentVideoSrc) return;

        inactiveVideo.querySelector('source').setAttribute('src', videoSrc);
        inactiveVideo.load();

        inactiveVideo.addEventListener('canplaythrough', function onCanPlayThrough() {
            inactiveVideo.removeEventListener('canplaythrough', onCanPlayThrough);
            activeVideo.pause();
            inactiveVideo.play().catch(error => console.error("Video play failed:", error));
            activeVideo.classList.remove('active');
            inactiveVideo.classList.add('active');
            [activeVideo, inactiveVideo] = [inactiveVideo, activeVideo];
            activeVideo.addEventListener('ended', switchVideo, { once: true });
        }, { once: true });
    }

    // --- Sentiment Analysis and Reaction ---
    const positiveWords = ['happy', 'excited', 'like', 'awesome', 'hello', 'beautiful'];
    const negativeWords = ['sad', 'angry', 'hate', 'upset'];

    const positiveVideos = [
        '视频资源/jimeng-2025-07-16-1043-笑着优雅的左右摇晃，过一会儿手扶着下巴，保持微笑.mp4',
        '视频资源/jimeng-2025-07-16-4437-比耶，然后微笑着优雅的左右摇晃.mp4',
        '视频资源/生成加油视频.mp4',
        '视频资源/生成跳舞视频.mp4'
    ];
    const negativeVideo = '视频资源/负面/jimeng-2025-07-16-9418-双手叉腰，嘴巴一直在嘟囔，表情微微生气.mp4';

    // --- Local Model Sentiment Analysis ---
    let classifier;
    analyzeButton.addEventListener('click', async () => {
        const text = sentimentInput.value;
        if (!text) return;

        sentimentResult.textContent = 'Analyzing...';

        // Initialize classifier on first click
        if (!classifier) {
            try {
                classifier = await pipeline('sentiment-analysis');
            } catch (error) {
                console.error('Model load failed:', error);
                sentimentResult.textContent = 'Sorry, model failed to load.';
                return;
            }
        }

        // Run sentiment analysis
        try {
            const result = await classifier(text);
            const primaryEmotion = result[0];
            sentimentResult.textContent = `Sentiment: ${primaryEmotion.label}, Score: ${primaryEmotion.score.toFixed(2)}`;
        } catch (error) {
            console.error('Sentiment analysis failed:', error);
            sentimentResult.textContent = 'Error during analysis.';
        }
    });

    // --- Local Speech Recognition --- //
    const localMicButton = document.getElementById('local-mic-button');
    const localAsrResult = document.getElementById('local-asr-result');

    let recognizer = null;
    let mediaRecorder = null;
    let isRecording = false;

    const handleRecord = async () => {
        // Toggle state: stop if recording
        if (isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            localMicButton.textContent = 'Start Local Recognition';
            localMicButton.classList.remove('recording');
            return;
        }

        // Initialize model (once)
        if (!recognizer) {
            localAsrResult.textContent = 'Loading speech recognition model...';
            try {
                recognizer = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
                localAsrResult.textContent = 'Model loaded, please start speaking...';
            } catch (error) {
                console.error('Model load failed:', error);
                localAsrResult.textContent = 'Sorry, model failed to load.';
                return;
            }
        }

        // Start recording
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];

            mediaRecorder.addEventListener("dataavailable", event => {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener("stop", async () => {
                const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                const arrayBuffer = await audioBlob.arrayBuffer();
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Check if audio data is empty
                if (arrayBuffer.byteLength === 0) {
                    localAsrResult.textContent = 'No audio recorded, please try again.';
                    return;
                }

                try {
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    const rawAudio = audioBuffer.getChannelData(0);
    
                    localAsrResult.textContent = 'Recognizing...';
                    const output = await recognizer(rawAudio);
                    localAsrResult.textContent = output.text || 'No content recognized.';
                } catch(e) {
                    console.error('Audio decode or recognition failed:', e);
                    localAsrResult.textContent = 'Error processing audio, please try again.';
                }
            });

            mediaRecorder.start();
            isRecording = true;
            localMicButton.textContent = 'Recording... Click to stop';
            localMicButton.classList.add('recording');

        } catch (error) {
            console.error('Speech recognition failed:', error);
            localAsrResult.textContent = 'Cannot access microphone or recognition error.';
            isRecording = false;
            localMicButton.textContent = 'Start Local Recognition';
            localMicButton.classList.remove('recording');
        }
    };

    localMicButton.addEventListener('click', handleRecord);

    function analyzeAndReact(text) {
        let reaction = 'neutral';

        if (positiveWords.some(word => text.toLowerCase().includes(word))) {
            reaction = 'positive';
        } else if (negativeWords.some(word => text.toLowerCase().includes(word))) {
            reaction = 'negative';
        }

        if (reaction !== 'neutral') {
            switchVideoByEmotion(reaction);
        }
    }

    function switchVideoByEmotion(emotion) {
        let nextVideoSrc;
        if (emotion === 'positive') {
            const randomIndex = Math.floor(Math.random() * positiveVideos.length);
            nextVideoSrc = positiveVideos[randomIndex];
        } else { // negative
            nextVideoSrc = negativeVideo;
        }

        // Avoid repeating the same video
        const currentVideoSrc = activeVideo.querySelector('source').getAttribute('src');
        if (nextVideoSrc === currentVideoSrc) return;

        // Switch video logic
        inactiveVideo.querySelector('source').setAttribute('src', nextVideoSrc);
        inactiveVideo.load();

        inactiveVideo.addEventListener('canplaythrough', function onCanPlayThrough() {
            inactiveVideo.removeEventListener('canplaythrough', onCanPlayThrough);
            activeVideo.pause();
            inactiveVideo.play().catch(error => console.error("Video play failed:", error));
            activeVideo.classList.remove('active');
            inactiveVideo.classList.add('active');
            [activeVideo, inactiveVideo] = [inactiveVideo, activeVideo];
            // After emotion-triggered video, return to random
            activeVideo.addEventListener('ended', switchVideo, { once: true });
        }, { once: true });
    }

});