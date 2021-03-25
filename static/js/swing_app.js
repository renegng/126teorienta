/************************** IMPORTS **************************/

// import AOS from 'aos';
import anchorme from 'anchorme';
import 'core-js';
import 'regenerator-runtime/runtime';
import { accountRedirect } from './swing_firebase';
import { MDCDialog } from '@material/dialog';
import { MDCDrawer } from "@material/drawer";
import { MDCFloatingLabel } from '@material/floating-label';
import { MDCIconButtonToggle } from '@material/icon-button';
import { MDCLinearProgress } from '@material/linear-progress';
import { MDCLineRipple } from '@material/line-ripple';
import { MDCList } from "@material/list";
import { MDCMenu, Corner } from '@material/menu';
import { MDCNotchedOutline } from '@material/notched-outline';
import { MDCRadio } from '@material/radio';
import { MDCRipple } from '@material/ripple';
import { MDCSelect } from '@material/select';
import { MDCSnackbar } from '@material/snackbar';
import { MDCTabBar } from '@material/tab-bar';
import { MDCTextField } from '@material/textfield';
import { MDCTextFieldHelperText } from '@material/textfield/helper-text';
import { MDCTextFieldIcon } from '@material/textfield/icon';
import { MDCTopAppBar } from '@material/top-app-bar';
import { Workbox } from 'workbox-window/Workbox.mjs';


/************************** FUNCTIONS **************************/

// Date getWeekOfMonth and getWeekOfYear implementation
Date.prototype.getDayString = function() {
    var weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return weekdays[this.getDay()];
};

Date.prototype.getWeekOfMonth = function(isMondayFirstDayOfWeek = true) {
    var d = new Date(this.getFullYear(), this.getMonth(), 1);
    var firstWeekday = d.getDay() - isMondayFirstDayOfWeek;
    if (firstWeekday < 0) firstWeekday = 6;
    var offsetDate = this.getDate() + firstWeekday - 1;
    return Math.floor(offsetDate / 7) + 1;
};

Date.prototype.getWeekOfYear = function() {
    var d = new Date(this.getFullYear(), this.getMonth(), this.getDate());
    var dayNum = d.getDay() || 7;
    d.setDate(d.getDate() + 4 - dayNum);
    var yearStart = new Date(d.getFullYear(),0,1);
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7)
};

export function newDate(dt = new Date()) {
    return new Date(dt);
}
/* Allow 'window' context to reference the function */
window.newDate = newDate;


// Date Format
export function returnFormatDate(dateTime, type = '') {
    var dt = new Date(dateTime);
    var year = dt.getFullYear();
    var month = dt.getMonth() + 1; //months starts at 0
    var day = dt.getDate();
    var hours = dt.getHours();
    var min = dt.getMinutes();
    var sec = dt.getSeconds();

    var ampm = (hours >= 12) ? 'pm' : 'am';
    var hoursampm = ((hours + 11) % 12 + 1);

    if (month.toString().length == 1) {
        month = '0' + month;
    }
    if (day.toString().length == 1) {
        day = '0' + day;
    }
    if (hoursampm.toString().length == 1) {
        hoursampm = '0' + hoursampm;
    }
    if (min.toString().length == 1) {
        min = '0' + min;
    }
    if (sec.toString().length == 1) {
        sec = '0' + sec;
    }

    var returnDateTime = '';
    var formatDate = day + '/' + month + '/' + year;
    var formatTime = hoursampm + ':' + min + ' ' + ampm;
    if (type == 'full') {
        returnDateTime += formatDate + ' - ';
        returnDateTime += formatTime;
    } else if (type == 'date') {
        returnDateTime += formatDate;
    } else {
        returnDateTime += formatTime;
    }

    return returnDateTime;
}
/* Allow 'window' context to reference the function */
window.returnFormatDate = returnFormatDate;


// Fetch API
export function getFetch(url, actionFn = null, options = {}) {
    mdcTopBarLoading.foundation_.adapter_.removeClass('container--hidden');
    mdcTopBarLoading.open();
    return fetch(url, options)
        .then((response) => {
            if (response.status >= 200 && response.status < 300) {
                return Promise.resolve(response)
            } else {
                return Promise.reject(new Error(response.statusText))
            }
        })
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            console.log('Request succeeded with JSON response: ', data);
            mdcTopBarLoading.close();
            mdcTopBarLoading.foundation_.adapter_.addClass('container--hidden');
            if (actionFn) {
                let fn = (typeof actionFn == "string") ? window[actionFn] : actionFn;
                fn(data);
            }
            return Promise.resolve(data);
        })
        .catch(function (error) {
            console.log('Request failed: ', error);
            mdcTopBarLoading.close();
            mdcTopBarLoading.foundation_.adapter_.addClass('container--hidden');
            return Promise.reject(error);
        });
}

export function postFetch(url, postData) {
    mdcTopBarLoading.foundation_.adapter_.removeClass('container--hidden');
    mdcTopBarLoading.open();
    return fetch(url, {
        method: 'POST',
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify(postData)
    })
    .then((response) => {
        return response.json();
    })
    .then((data) => {
        console.log('Request succeeded with JSON response: ', data);
        mdcTopBarLoading.close();
        mdcTopBarLoading.foundation_.adapter_.addClass('container--hidden');
        if ('cmd' in data && data.cmd == 'redirectURL') {
            window.location.assign(data.action);
        }
        return Promise.resolve(data);
    })
    .catch(function (error) {
        console.log('Request failed: ', error);
        mdcTopBarLoading.close();
        mdcTopBarLoading.foundation_.adapter_.addClass('container--hidden');
        return Promise.reject(error);
    });
}


// Play/Stop Audio File
Audio.prototype.stop = function() {
    this.pause();
    this.currentTime = 0;
};

export function playAudio(audioEl, play) {
    if (play) {
        audioEl.play();
    } else {
        audioEl.stop();
    }
}


// Send Chat Message
export function createChatMessageContainer(txt, dateTime, user, userName = '', appendBefore = false) {
    let msgContainer = document.createElement('p');
    let msgContainerMsg = document.createElement('span');
    let msgContainerTime = document.createElement('span');

    msgContainer.classList.add('animate__animated', 'animate__headShake');
    msgContainerMsg.classList.add('container-chat--body-message-message', 'mdc-typography--subtitle1', 'container-elevation-s');
    msgContainerTime.classList.add('container-chat--body-message-message-time', 'mdc-typography--caption', 's-font-color-on-surface');

    if (user == 'me') {
        msgContainer.classList.add('container-chat--body-message-me');
        msgContainerMsg.classList.add('s-font-color-on-primary');
    } else if (user == 'others') {
        let msgContainerUser = document.createElement('span');

        msgContainer.classList.add('container-chat--body-message-others');
        msgContainerMsg.classList.add('s-font-color-on-secondary');
        msgContainerUser.classList.add('container-chat--body-message-message-user', 'mdc-typography--caption', 's-font-color-secondary');

        msgContainerUser.textContent = userName;
        msgContainer.appendChild(msgContainerUser);
    } else if (user == 'auto') {
        msgContainer.classList.add('container-chat--body-message-auto', 's-font-align-center');
        msgContainerMsg = document.createElement('span');
        msgContainerMsg.classList.add('mdc-typography--caption', 's-font-color-secondary');
    }

    // Anchorme detects and replaces text with proper link tags
    let amtxt = anchorme({
        input: txt,
        options: {
            attributes: {
                target: "_blank"
            }
        }
    });
    msgContainerMsg.innerHTML = amtxt;
    msgContainer.appendChild(msgContainerMsg);
    
    if (user != 'auto') {
        if (appendBefore) {
            msgContainerTime.textContent = returnFormatDate(dateTime, 'full');
        } else {
            msgContainerTime.textContent = returnFormatDate(dateTime);
        }
        msgContainer.appendChild(msgContainerTime);
    }

    return msgContainer;
}

var lastMsgUser = '';
export function appendChatMessage(txt, dateTime, user, userName = '', chatMsgElem = '', otherUserPhoto = '', appendBefore = false) {
    let chatContainer = document.querySelector('.container-chat--body-messages-active');
    if (chatMsgElem) {
        chatContainer = document.getElementById('m_' + chatMsgElem);
    }
    let msgContainer = createChatMessageContainer(txt, dateTime, user, userName, appendBefore);

    if (lastMsgUser != userName && user != 'auto') {
        let msgContainerUserHeader = document.createElement('p');
        let msgContainerUserHeaderPic = document.createElement('img');
        let msgContainerUserHeaderName = document.createElement('span');

        msgContainerUserHeaderName.classList.add('mdc-typography--overline');

        switch (user) {
            case 'me':
                msgContainerUserHeader.classList.add('container-chat--body-header-me');
                msgContainerUserHeaderPic.src = advStreams.myUserInfo.photoURL;
                msgContainerUserHeaderName.textContent = userName;
                break;
            case 'others':
                msgContainerUserHeader.classList.add('container-chat--body-header-others');
                msgContainerUserHeaderPic.src = (otherUserPhoto)? otherUserPhoto : advStreams.otherUserInfo.photoURL;
                msgContainerUserHeaderName.textContent = userName;
                break;
        }

        msgContainerUserHeader.appendChild(msgContainerUserHeaderPic);
        msgContainerUserHeader.appendChild(msgContainerUserHeaderName);

        if (appendBefore) {
            let insBefElm = chatContainer.querySelector('.container-chat--body-messages-load');
            chatContainer.insertBefore(msgContainerUserHeader, insBefElm)
        } else {
            chatContainer.appendChild(msgContainerUserHeader);
        }

        lastMsgUser = userName;
    }
    
    if (appendBefore) {
        let insBefElm = chatContainer.querySelector('.container-chat--body-messages-load');
        chatContainer.insertBefore(msgContainer, insBefElm)
    } else {
        chatContainer.appendChild(msgContainer);
    }
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

var isTypingTimeout = null;
export function sendChatMessage() {
    let dateTime = Date.now();
    let textElement = document.getElementById('chat-textarea-input');
    let textMessage = textElement.value;
    if (!textElement.disabled && textMessage && textMessage.trim() != "") {
        sendPeerChatMessage(
            'msg',
            textMessage,
            dateTime,
            advStreams.myUserInfo.name
        );
        appendChatMessage(textMessage, dateTime, 'me', advStreams.myUserInfo.name);
        textElement.value = '';
        textElement.focus();
    }
}
/* Allow 'window' context to reference the function */
window.sendChatMessage = sendChatMessage;
/* Enable the Enter Key for the Chat Text Area */
if (document.querySelector('#chat-textarea-input')) {
    document.querySelector('#chat-textarea-input').addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter') {
            evt.preventDefault();
            document.querySelector('#chat-textarea-button').click();
        }

        if (isTypingTimeout !== null) {
            window.clearTimeout(isTypingTimeout);
            isTypingTimeout = window.setTimeout(() => {sendIsTyping(false)}, 1000);
        } else if (isTypingTimeout === null) {
            isTypingTimeout = window.setTimeout(() => {sendIsTyping(false)}, 1000);
            sendIsTyping(true);
        }
    });
}
/* Is Typing Function */
function sendIsTyping(isTyping) {
    if (peer && !peer.destroyed) {
        // Send message of User Typing either True or False
        peer.send(JSON.stringify({
            msgType: 'typ',
            msg: isTyping
        }));
    }
    
    // If User Typing has stopped, reset variable
    if (!isTyping) {
        isTypingTimeout = null;
    }
}

var offlineMsgs = [];
export function sendPeerChatMessage(type, text, dateTime, userName) {
    if (peer && !peer.destroyed) {
        peer.send(JSON.stringify({
            msgType: type,
            msg: text,
            msgDateTime: dateTime,
            msgUserName: userName
        }));
        if (enableMsgDBStore && type == 'msg') {
            storeConvMsg(advStreams.myUserInfo.id, text, dateTime, peer);
        }
    } else if (enableOfflineMsgs) {
        offlineMsgs.push(JSON.stringify({
            msgType: type,
            msg: text,
            msgDateTime: dateTime,
            msgUserName: userName
        }));
    }
}
/* Allow 'window' context to reference the function */
window.sendPeerChatMessage = sendPeerChatMessage;

// Send all offline messages once online
export function sendOfflineMsgs() {
    if (peer && offlineMsgs.length > 0) {
        
        offlineMsgs.forEach((msg) => {
            peer.send(msg);
        });

        offlineMsgs = [];
    }
}
/* Allow 'window' context to reference the function */
window.sendOfflineMsgs = sendOfflineMsgs;

/* Scroll Conversation to bottom on window resize */
const chatResizeObserver = new ResizeObserver(entries => {
    let chatContainer = document.querySelector('.container-chat--body-messages-active');
    if (chatContainer){
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
});
chatResizeObserver.observe(document.body);


// Audio/Video Call Functions
export const advStreams = {
    myStream: null,
    myStreamSended: false,
    myUserInfo: {id: '', name: '', photoURL: '', roles: ''},
    otherUserInfo: null,
    otherUserStream: null
};
/* Allow 'window' context to reference the function */
window.advStreams = advStreams;

function startUserMedia(av, state) {
    let constraints = null;

    if (av == 'audio') {
        // Only Audio is being requested
        constraints = {
            audio: {
                volume: 1
            },
            video: false
        };
    } else if (av == 'audiovideo') {
        // Audio & Video are being requested
        constraints = {
            audio: {
                volume: 1
            },
            video: {
                facingMode: 'user',
                height: { ideal: 720, max: 1080 },
                width: { ideal: 1280, max: 1920 }
            }
        };
    }

    // Request User Devices
    navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
        managePeerStream('save', stream);
        displayCallUI(state, av);
        sendPeerChatMessage(
            av,
            (state == 'init') ? 'accept' : state,
            Date.now(),
            advStreams.myUserInfo.name
        );
        if (state == 'accepted') {
            managePeerStream('send');
        }
    })
    .catch((err) => {
        console.log(err);
        displayCallUI('ended');
        if (err.name == 'NotAllowedError') {
            initSnackbar(snackbar, failedGetUserMediaSBDataObj);
        } else {
            let errMsgSBDataObj = Object.assign({}, failedGetUserMediaSBDataObj);
            errMsgSBDataObj.message = err.name;
            initSnackbar(snackbar, errMsgSBDataObj);
        }
        if (state != 'init') {
            sendPeerChatMessage(
                'audiovideo',
                'ended',
                Date.now(),
                advStreams.myUserInfo.name
            );
        }
    });
}

// Snackbar Data for Failed Get User Media Devices
const failedGetUserMediaSBDataObj = {
    actionHandler: () => { console.log('GetUserMedia Devices Failed...'); },
    actionText: 'OK',
    message: 'Por favor habilite el acceso a la cámara y/o micrófono.',
    timeout: 10000
};

// Snackbar Data for Connecting Peers
const conPeerSBDataObj = {
    actionHandler: () => { console.log('Connecting to user...'); },
    actionText: 'OK',
    message: 'Conectando con Usuari@.',
    timeout: 4500
};

// Snackbar Data for Disconnecting Peers
const disconPeerSBDataObj = {
    actionHandler: () => { console.log('User disconnected.'); },
    actionText: 'OK',
    message: 'Usuari@ desconectad@.',
    timeout: 10000
};

// Snackbar Data for Transfering Peers
const transferPeerSBDataObj = {
    actionHandler: () => { console.log('Transfering user...'); },
    actionText: 'OK',
    message: 'Usuari@ transferid@.',
    timeout: 5000
};

// Snackbar Data for Receiving Transferral Peers
const transferralPeerSBDataObj = {
    actionHandler: () => { console.log('User transferral received.'); },
    actionText: 'OK',
    message: 'Usuari@ asignad@.',
    timeout: 10000
};

// Show or Hide Audio/Video Call UI
export function displayCallUI(state, av = '') {
    switch (state) {
        case 'accept':
            /************************************************************
             *
             * - Call interface displayed
             * - Accept Call button displayed
             * - Hang Up button displayed
             * - Sound FX Calling Loop
             * 
            *************************************************************/
            document.querySelector('.mdc-fab--hangup').classList.remove('container--hidden');
            if (av == 'audio') {
                document.querySelector('#answer-call').classList.remove('container--hidden');
            } else if (av == 'audiovideo') {
                document.querySelector('#answer-videocall').classList.remove('container--hidden');
            }
            document.querySelector('.container-avcalls').classList.remove('container--hidden');
            document.querySelector('.container-avcalls').classList.add('animate__animated', 'animate__faster', 'animate__fadeIn');
            document.querySelector('.container-chat').classList.add('container--hidden');
            playAudio(document.querySelector('#sound-fx-calling'), true);
            break;

        case 'accepted':
            /************************************************************
             *
             * - Call interface displayed
             * - Hang Up button displayed
             * - Sound FX Connected Once
             * - Sound FX Calling Loop Stop
             * - Show Video UI if Video
             * - Show Mute Button
             * 
            *************************************************************/
            document.querySelector('.mdc-fab--hangup').classList.remove('container--hidden');
            if (av == 'audio') {
                document.querySelector('#answer-call').classList.add('container--hidden');
            } else if (av == 'audiovideo') {
                document.querySelector('#answer-videocall').classList.add('container--hidden');
                document.querySelector('#toggle-video-call').classList.remove('container--hidden');
                document.querySelector('.container-avcalls--callerid').classList.add('container--hidden');
                document.querySelector('.container-avcalls--video-main').classList.remove('container--hidden');
                document.querySelector('.container-avcalls--videos').classList.remove('container--hidden');
                document.querySelector('.container-avcalls--video-small').classList.remove('container--hidden');
            }
            document.querySelector('#mute-mic').classList.remove('container--hidden');
            document.querySelector('.container-avcalls').classList.remove('container--hidden');
            document.querySelector('.container-avcalls').classList.add('animate__animated', 'animate__faster', 'animate__fadeIn');
            document.querySelector('.container-chat').classList.add('container--hidden');
            playAudio(document.querySelector('#sound-fx-calling'), false);
            playAudio(document.querySelector('#sound-fx-connected'), true);
            break;

        case 'ended':
            /************************************************************
             *
             * - Call interface hidden
             * - Hang Up button displayed
             * - Sound FX Ended Once
             * - Sound FX Calling Loop Stop
             * 
            *************************************************************/
            document.querySelector('.mdc-fab--hangup').classList.remove('container--hidden');
            document.querySelector('.mdc-fab--answer').classList.add('container--hidden');
            document.querySelector('.container-avcalls--callerid').classList.remove('container--hidden');
            document.querySelector('.container-avcalls--video-main').classList.add('container--hidden');
            document.querySelector('.container-avcalls--videos').classList.add('container--hidden');
            document.querySelector('.container-avcalls--video-small').classList.add('container--hidden');
            document.querySelector('.container-avcalls').classList.add('container--hidden');
            document.querySelector('.container-avcalls').classList.remove('animate__animated', 'animate__faster', 'animate__fadeIn');
            document.querySelector('.container-chat').classList.remove('container--hidden');
            document.querySelector('#toggle-video-call').classList.add('mdc-fab--active');
            document.querySelector('#toggle-video-call').classList.add('container--hidden');
            document.querySelector('#mute-mic').classList.remove('mdc-fab--active');
            document.querySelector('#mute-mic').classList.add('container--hidden');
            playAudio(document.querySelector('#sound-fx-calling'), false);
            playAudio(document.querySelector('#sound-fx-ended'), true);
            break;

        case 'init':
            /************************************************************
             *
             * - Call interface displayed
             * - Hang Up button displayed
             * - Sound FX Calling Loop
             * 
            *************************************************************/
            document.querySelector('.mdc-fab--hangup').classList.remove('container--hidden');
            document.querySelector('.mdc-fab--answer').classList.add('container--hidden');
            document.querySelector('.container-avcalls').classList.remove('container--hidden');
            document.querySelector('.container-avcalls').classList.add('animate__animated', 'animate__faster', 'animate__fadeIn');
            document.querySelector('.container-chat').classList.add('container--hidden');
            playAudio(document.querySelector('#sound-fx-calling'), true);
            break;
    }
}
/* Allow 'window' context to reference the function */
window.displayCallUI = displayCallUI;

export function initAudioCall() {
    document.getElementById('chat-textarea-input').value = '- Inicio de Audio llamada';
    document.getElementById('chat-textarea-button').click();
    startUserMedia('audio', 'init');
}
/* Allow 'window' context to reference the function */
window.initAudioCall = initAudioCall;

export function acceptAudioCall() {
    startUserMedia('audio', 'accepted');
}
/* Allow 'window' context to reference the function */
window.acceptAudioCall = acceptAudioCall;

export function initVideoCall() {
    document.getElementById('chat-textarea-input').value = '- Inicio de Video llamada';
    document.getElementById('chat-textarea-button').click();
    startUserMedia('audiovideo', 'init');
}
/* Allow 'window' context to reference the function */
window.initVideoCall = initVideoCall;

export function acceptVideoCall() {
    startUserMedia('audiovideo', 'accepted');
}
/* Allow 'window' context to reference the function */
window.acceptVideoCall = acceptVideoCall;

export function endAVCall(sendMsg = true) {
    displayCallUI('ended');
    if (sendMsg) {
        sendPeerChatMessage(
            'audiovideo',
            'ended',
            Date.now(),
            advStreams.myUserInfo.name
        );
        document.getElementById('chat-textarea-input').value = '- Fin de llamada';
        document.getElementById('chat-textarea-button').click();
    }
    managePeerStream('end');
}
/* Allow 'window' context to reference the function */
window.endAVCall = endAVCall;

export function managePeerStream(action, stream = null) {
    if (peer && !peer.destroyed) {
        switch (action) {
            case 'end':
                /* Finalize my Stream and any other Stream */
                if (advStreams.myStream) {
                    advStreams.myStream.getAudioTracks().forEach((track) => {
                        track.stop();
                        if (advStreams.myStreamSended) {
                            peer.removeTrack(track, advStreams.myStream);
                        }
                    });
                    advStreams.myStream.getVideoTracks().forEach((track) => {
                        track.stop();
                        if (advStreams.myStreamSended) {
                            peer.removeTrack(track, advStreams.myStream);
                        }
                    });
                }
                advStreams.myStreamSended = false;
                advStreams.otherUserStream = null;
                break;
            
            case 'save':
                /* Adds My Stream to advStreams */
                console.log('Saving My Stream');
                advStreams.myStream = stream;
                break;

            case 'saveRemote':
                /* Adds Remote Stream to advStreams */
                console.log('Saving Remote Stream');
                advStreams.otherUserStream = stream;
                break;

            case 'send':
                /* Sends My Stream to Remote */
                console.log('Sending My Stream');
                if (advStreams.myStream) {
                    peer.addStream(advStreams.myStream);
                    advStreams.myStreamSended = true;
                } else {
                    console.log('SWCMS: No local stream to send.');
                }
                break;
        }
    }
}
/* Allow 'window' context to reference the function */
window.managePeerStream = managePeerStream;

export function setAVStream(otherStream) {
    let videoTracks = otherStream.getVideoTracks();
    if (videoTracks.length > 0) {
        /* The stream is a video stream */
        document.querySelector('.container-avcalls--video-small').srcObject = advStreams.myStream;
        document.querySelector('.container-avcalls--video-small').muted = true;
        document.querySelector('.container-avcalls--video-small').play();
        document.querySelector('.container-avcalls--video-main').srcObject = otherStream;
        document.querySelector('.container-avcalls--video-main').play();
    } else {
        /* The stream is an audio stream */
        document.querySelector('.container-avcalls--audio').srcObject = otherStream;
        document.querySelector('.container-avcalls--audio').play();
    }
    managePeerStream('saveRemote', otherStream);
}
/* Allow 'window' context to reference the function */
window.setAVStream = setAVStream;

export function muteAudio() {
    advStreams.myStream.getAudioTracks().forEach((track) => {
        if (track.enabled) {
            track.enabled = false;
            document.querySelector('#mute-mic').classList.add('mdc-fab--active');
        } else {
            track.enabled = true;
            document.querySelector('#mute-mic').classList.remove('mdc-fab--active');
        }
    });
}
/* Allow 'window' context to reference the function */
window.muteAudio = muteAudio;

export function stopVideo() {
    advStreams.myStream.getVideoTracks().forEach((track) => {
        if (track.enabled) {
            track.enabled = false;
            document.querySelector('#toggle-video-call').classList.remove('mdc-fab--active');
        } else {
            track.enabled = true;
            document.querySelector('#toggle-video-call').classList.add('mdc-fab--active');
        }
    });
}
/* Allow 'window' context to reference the function */
window.stopVideo = stopVideo;


// Show Tabs Content
export function showTabContent(e) {
    var tabId = e.target.id;
    var tabIndex = e.detail.index;
    var tabsContentId = tabId + "-content";
    var tabsContentEl = document.getElementById(tabsContentId);
    Array.from(tabsContentEl.getElementsByClassName('s-article__text')).forEach((elem) => {
        if (elem.tabIndex == tabIndex) {
            elem.classList.remove('s-article__text--hidden');
            elem.classList.add('s-article__text--show');
        } else {
            elem.classList.add('s-article__text--hidden');
            elem.classList.remove('s-article__text--show');
        }
    });
}


// Snackbar init function
let sbCurrEvent = null;
export function initSnackbar(sb, initObject) {
    if (!sb) sb = snackbar;
    if (sb.isOpen) {
        sb.close('New snackbar initialization...');
    }
    if (sbCurrEvent) {
        sb.unlisten('MDCSnackbar:closed', sbCurrEvent);
    }
    if ('showError' in initObject && initObject.showError) {
        sb.foundation_.adapter_.addClass('mdc-snackbar__label-error-show');
    } else {
        sb.foundation_.adapter_.removeClass('mdc-snackbar__label-error-show');
    }
    if ('showSuccess' in initObject && initObject.showSuccess) {
        sb.foundation_.adapter_.addClass('mdc-snackbar__label-success-show');
    } else {
        sb.foundation_.adapter_.removeClass('mdc-snackbar__label-success-show');
    }

    sb.labelText = initObject.message;
    sb.actionButtonText = initObject.actionText;
    sb.timeoutMs = initObject.timeout;
    sbCurrEvent = ((evt) => {
        if (evt.detail.reason == 'action') {
            initObject.actionHandler();
        }
    });
    sb.listen('MDCSnackbar:closed', sbCurrEvent);
    sb.open();
}
/* Allow 'window' context to reference the function */
window.initSnackbar = initSnackbar;


// Show Snackbars of User Connection and Disconnection
export function showUserRTCConSnackbar(state, arg = '') {
    let sbdo = null;
    switch (state) {
        case 'con':
            sbdo = Object.assign({}, conPeerSBDataObj);
            if (arg) { sbdo.message = sbdo.message.replace('Usuari@', arg); }
            break;
        case 'dcon':
            sbdo = Object.assign({}, disconPeerSBDataObj);
            if (arg) { sbdo.message = sbdo.message.replace('Usuari@', arg); }
            break;
        case 'err':
            sbdo = Object.assign({}, failedGetUserMediaSBDataObj);
            if (arg) { sbdo.message = arg; }
            break;
        case 'trn':
            sbdo = Object.assign({}, transferPeerSBDataObj);
            if (arg) { sbdo.message = sbdo.message.replace('Usuari@', arg); }
            break;
        case 'trnRcv':
            sbdo = Object.assign({}, transferralPeerSBDataObj);
            if (arg) { sbdo.message = sbdo.message.replace('Usuari@', arg); }
            break;
    }
    initSnackbar(snackbar, sbdo);
}
/* Allow 'window' context to reference the function */
window.showUserRTCConSnackbar = showUserRTCConSnackbar;


// Social Media Share Redirect
// Applications URLs
const emailShareUrl = "mailto:?body=";
const facebookShareUrl = "https://www.facebook.com/sharer/sharer.php?u=";
const googlePlusShareURL = "https://plus.google.com/share?url=";
const linkedInShareURL = "https://www.linkedin.com/shareArticle?mini=true&url=";
const twitterShareURL = "https://twitter.com/share?ref_src=twsrc%5Etfw&text=";
const whatsAppShareURL = "https://wa.me/?text=";
export function shareRedirect(e) {
    // Default text of the share message
    var shareText = "¡Mira lo que encontré!";
    shareText = encodeURIComponent(shareText);

    // Share parameters
    var shareMyURL = location.href;
    shareMyURL = encodeURIComponent(shareMyURL);

    var shareTitle = document.title;
    shareTitle = encodeURIComponent(shareTitle);

    // Open a new window to share the content
    var shareAppName = e.detail.item.getElementsByClassName('mdc-list-item__text')[0].textContent;
    shareAppName = shareAppName.toLowerCase().trim();

    switch (shareAppName) {
        case 'email':
            window.open(emailShareUrl + shareTitle + " - " + shareMyURL + "&subject=" + shareText + " - " + shareTitle);
            break;
        case 'facebook':
            window.open(facebookShareUrl + shareMyURL);
            break;
        case 'google+':
            window.open(googlePlusShareURL + shareMyURL);
            break;
        case 'linkedin':
            window.open(linkedInShareURL + shareMyURL + "&title=" + shareTitle);
            break;
        case 'twitter':
            window.open(twitterShareURL + shareText + " - " + shareTitle + ": " + shareMyURL);
            break;
        case 'whatsapp':
            window.open(whatsAppShareURL + shareText + " - " + shareTitle + ": " + shareMyURL);
            break;
        default:
            console.log("No implementation for SHARING to app named: " + shareAppName);
    }
}


/************************** LIBRARIES INIT **************************/

// Initialize AOS
// AOS.init();


/************************** MATERIAL DESIGN COMPONENTS INIT **************************/

// Material Dialog
var assignedDialogEl = document.querySelector('#assigned-dialog');
if (assignedDialogEl) {
    mdcAssignedDialogEl = new MDCDialog(assignedDialogEl);
}

var disconnectedDialogEl = document.querySelector('#disconnected-dialog');
if (disconnectedDialogEl) {
    mdcDisconnectedDialogEl = new MDCDialog(disconnectedDialogEl);
}

var endRTCDialogEl = document.querySelector('#endrtc-dialog');
if (endRTCDialogEl) {
    mdcEndRTCDialogEl = new MDCDialog(endRTCDialogEl);
}

var transferDialogEl = document.querySelector('#transfer-dialog');
if (transferDialogEl) {
    mdcTransferDialogEl = new MDCDialog(transferDialogEl);
}


// Material Drawer & Top App Bar
const drawerEl = document.querySelector('.mdc-drawer');
const topAppBarEl = document.querySelector('.mdc-top-app-bar');
const topAppBarNavEl = document.querySelector('.mdc-top-app-bar__navigation-icon');
if (drawerEl && topAppBarEl) {
    const mainContentEl = document.querySelector('.mdc-drawer-app-content');
    const drawerItemsEl = document.querySelector('.mdc-drawer__content .mdc-list');

    const topAppBar = MDCTopAppBar.attachTo(topAppBarEl);
    topAppBar.setScrollTarget(mainContentEl);

    let isDrawerModal = false;
    let drawerItemHref = null;
    let isHrefNoHistory = false;

    const initModalDrawer = () => {
        isDrawerModal = true;
        drawerEl.classList.add("mdc-drawer--modal");
        topAppBarNavEl.classList.remove("mdc-top-app-bar__navigation-icon--hidden");

        const drawer = MDCDrawer.attachTo(drawerEl);
        drawer.open = false;

        topAppBar.listen('MDCTopAppBar:nav', () => {
            drawer.open = !drawer.open;
        });

        document.body.addEventListener('MDCDrawer:closed', () => {
            drawer.handleScrimClick;
            mainContentEl.querySelector('input, button').focus();
            if (drawerItemHref) {
                if (isHrefNoHistory) {
                    window.location.replace(drawerItemHref);
                } else {
                    window.location.assign(drawerItemHref);
                }
            }
        });

        return drawer;
    }

    const initPermanentDrawer = () => {
        isDrawerModal = false;
        drawerEl.classList.remove("mdc-drawer--modal");
        topAppBarNavEl.classList.add("mdc-top-app-bar__navigation-icon--hidden");

        const permDrawerList = new MDCList(drawerItemsEl);
        permDrawerList.wrapFocus = true;

        return permDrawerList;
    }

    let drawer = window.matchMedia("(max-width: 52.49em)").matches ? initModalDrawer() : initPermanentDrawer();
    
    drawerItemsEl.addEventListener('click', (event) => {
        drawerItemHref = event.target.href;
        isHrefNoHistory = event.target.hasAttribute('data-no-history');
        if (isDrawerModal) {
            drawer.open = false;
            event.preventDefault();
        } else {
            if (isHrefNoHistory) {
                event.preventDefault();
                window.location.replace(drawerItemHref);
            }
        }
    });

    // Toggle between permanent drawer and modal drawer at breakpoint 52.49em
    const resizeHandler = () => {
        if (window.matchMedia("(max-width: 52.49em)").matches && drawer instanceof MDCList) {
            drawer.destroy();
            drawer = initModalDrawer();
        } else if (window.matchMedia("(min-width: 52.5em)").matches && drawer instanceof MDCDrawer) {
            drawer.destroy();
            drawer = initPermanentDrawer();
        }
    }

    window.addEventListener('resize', resizeHandler);

    const myURL = location.pathname;

    Array.from(drawerItemsEl.children).forEach((child, index) => {
        let menuURL = child.getAttribute('href');
        if (menuURL != null && menuURL == myURL) {
            child.classList.add("mdc-list-item--activated");
        }
    });
} else if (topAppBarEl) {
    const topAppBar = MDCTopAppBar.attachTo(topAppBarEl);
    const mainContentEl = document.querySelector('.mdc-drawer-app-content');

    topAppBar.setScrollTarget(mainContentEl);
    topAppBarNavEl.classList.add("mdc-top-app-bar__navigation-icon--hidden");
}


// Material Floating Labels
var mdcFloatingLabels = [].map.call(document.querySelectorAll('.mdc-floating-label'), function (el) {
    return new MDCFloatingLabel(el);
});


// Material Image List Open Image
if (document.querySelector('.mdc-image-list__image')) {
    Array.from(document.getElementsByClassName('mdc-image-list__image')).forEach((elem) => {
        elem.addEventListener('click', () => (window.open(elem.getAttribute('src'))));
    });
}


// Material Line Ripples
var mdcLineRipples = [].map.call(document.querySelectorAll('.mdc-line-ripple'), function (el) {
    return new MDCLineRipple(el);
});


// Material Linear Progress
export const mdcTopBarLoading = new MDCLinearProgress(document.querySelector('.s-topbar-loading'));

var mdcLinearProgress = [].map.call(document.querySelectorAll('.mdc-linear-progress:not(.s-topbar-loading)'), function (el) {
    return new MDCLinearProgress(el);
});


// Material Lists
var mdcLists = [].map.call(document.querySelectorAll('.mdc-list:not(.mdc-menu__items):not(.mdc-select__list)'), function (el) {
    let elList = new MDCList(el);
    let elID = el.getAttribute('id');
    let actionFn = el.getAttribute('data-action-fn');
    if (actionFn) {
        let fn = (typeof actionFn == "string") ? window[actionFn] : actionFn;
        elList.listen('MDCList:action', (evt) => fn(elID, evt.detail.index));
    }
    return elList.listElements.map((listItemEl) => new MDCRipple(listItemEl));
});


// Material Menu
var accountMenu = null;
var accountMenuButton = null;
if (document.querySelector('#accountMenu')) {
    accountMenu = new MDCMenu(document.querySelector('#accountMenu'));
    accountMenuButton = document.querySelector('#accountButton');
}
if (accountMenuButton != null) {
    accountMenuButton.addEventListener('click', () => (accountMenu.open = !accountMenu.open));
    accountMenu.setAnchorCorner(Corner.BOTTOM_START);
    document.querySelector('#accountMenu').addEventListener('MDCMenu:selected', evt => accountRedirect(evt));
}

var accountStatus = null;
var accountStatusButton = null;
if (document.querySelector('#accountStatus')) {
    accountStatus = new MDCMenu(document.querySelector('#accountStatus'));
    accountStatusButton = document.querySelector('#header-accountImage');
}
if (accountStatusButton != null) {
    let fn = window['updateRTCUserPersonalStatus'];
    accountStatusButton.addEventListener('click', () => (accountStatus.open = !accountStatus.open));
    accountStatus.setAnchorCorner(Corner.BOTTOM_START);
    document.querySelector('#accountStatus').addEventListener('MDCMenu:selected', evt => fn(evt));
}

var moreOptionMenu = null;
var moreOptionMenuButton = null;
if (document.querySelector('#moreOptionsMenu')) {
    moreOptionMenu = new MDCMenu(document.querySelector('#moreOptionsMenu'));
    moreOptionMenuButton = document.querySelector('#moreOptionsButton');
}
if (moreOptionMenuButton != null) {
    moreOptionMenuButton.addEventListener('click', () => (moreOptionMenu.open = !moreOptionMenu.open));
    moreOptionMenu.setAnchorCorner(Corner.BOTTOM_START);
    document.querySelector('#moreOptionsMenu').addEventListener('MDCMenu:selected', evt => moreOptionsSelection(evt.detail.index));
}

var shareMenu = null;
var shareMenuButton = null;
if (document.querySelector('#shareMenu')) {
    shareMenu = new MDCMenu(document.querySelector('#shareMenu'));
    shareMenuButton = document.querySelector('#shareButton');
}
if (shareMenuButton != null) {
    shareMenuButton.addEventListener('click', () => (shareMenu.open = !shareMenu.open));
    shareMenu.setAnchorCorner(Corner.BOTTOM_START);
    document.querySelector('#shareMenu').addEventListener('MDCMenu:selected', evt => shareRedirect(evt));
}


// Material Notched Outline
var mdcNotchedOutlines = [].map.call(document.querySelectorAll('.mdc-notched-outline'), function (el) {
    return new MDCNotchedOutline(el);
});


// Material Radio Buttons
var mdcRadioButtons = [].map.call(document.querySelectorAll('.mdc-radio'), function (el) {
    return new MDCRadio(el);
});


// Material Ripple
let mdcButtonRipples = [].map.call(document.querySelectorAll('.mdc-icon-button'), function (el) {
    return new MDCRipple(el);
});
mdcButtonRipples.forEach((elem) => {
    elem.unbounded = true;
});
mdcButtonRipples = mdcButtonRipples.concat([].map.call(document.querySelectorAll('.mdc-button, .mdc-fab'), function (el) {
    return new MDCRipple(el);
}));


// Material Snackbar
const snackbar = new MDCSnackbar(document.querySelector('.mdc-snackbar'));


// Material Selects
export var mdcSelects = [].map.call(document.querySelectorAll('.mdc-select'), function (el) {
    let mdcSel = new MDCSelect(el);
    let actionFn = el.getAttribute('data-action-fn');
    if (actionFn) {
        let fn = (typeof actionFn == "string") ? window[actionFn] : actionFn;
        mdcSel.listen('MDCSelect:change', () => fn(mdcSel.value));
    }
    if (el.hasAttribute('data-assigned-var')) {
        MDCSelect.prototype.assignedVar = null;
        mdcSel.assignedVar = el.getAttribute('id');
    }
    return mdcSel;
});


// Material Tab
var mdcTabBars = [].map.call(document.querySelectorAll('.mdc-tab-bar'), function (el) {
    let mdcTab = new MDCTabBar(el);
    let actionFn = el.getAttribute('data-action-fn');
    if (actionFn) {
        let fn = (typeof actionFn == "string") ? window[actionFn] : actionFn;
        mdcTab.listen('MDCTabBar:activated', (evt) => fn(evt.detail.index));
    }
    if (el.hasAttribute('data-assigned-var')) {
        MDCTabBar.prototype.assignedVar = null;
        mdcTab.assignedVar = el.getAttribute('id');
    }
    return mdcTab;
});
// document.querySelector('#mdc-tab-bar__id-noticias').addEventListener('MDCTabBar:activated', evt => showTabContent(evt));


// Material Textfields
export var mdcTextInputs = [].map.call(document.querySelectorAll('.mdc-text-field'), function (el) {
    let mdcTxt = new MDCTextField(el);
    if (el.hasAttribute('data-assigned-var')) {
        MDCTextField.prototype.assignedVar = null;
        mdcTxt.assignedVar = el.getAttribute('id');
    }
    return mdcTxt;
});


// Material Textfields Helper Text
var mdcTFHelperTexts = [].map.call(document.querySelectorAll('.mdc-text-field-helper-text'), function (el) {
    return new MDCTextFieldHelperText(el);
});


// Material Textfields Icons
var mdcTextInputsIcons = [].map.call(document.querySelectorAll('.mdc-text-field-icon'), function (el) {
    return new MDCTextFieldIcon(el);
});


// Material Button Element Actions On Click
document.querySelectorAll('.mdc-button[data-action-type], .mdc-icon-button[data-action-type], .mdc-fab[data-action-type]').forEach(buttonEl => {
    let actionType = buttonEl.getAttribute('data-action-type');
    if (actionType == 'redirect') {
        let actionVal = buttonEl.getAttribute('data-action-val');
        buttonEl.addEventListener('click', () => {
            if (buttonEl.hasAttribute('data-no-history')) {
                window.location.replace(actionVal);
            } else {
                window.location.assign(actionVal);
            }
        });
    } else if (actionType == 'submit') {
        let actionFn = buttonEl.getAttribute('data-action-fn');
        let fn = (typeof actionFn == "string") ? window[actionFn] : actionFn;
        buttonEl.addEventListener('click', fn);
    }
});


// Google Maps component
if (document.querySelector('.s-googlemaps')) {
    var gmComp = document.querySelector('.s-googlemaps');
    var gmURLL = 'https://www.google.com/maps?output=embed&daddr=ciudad+mujer&saddr=';
    var gmIfrS = "<iframe src='";
    var gmIfrE = "' class='s-googlemaps__iframe' frameborder='0' style='border:0;' allowfullscreen></iframe>";
    // Try HTML5 geolocation.
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            var pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            gmComp.innerHTML = "";
            gmComp.innerHTML = gmIfrS + gmURLL + pos.lat + ',' + pos.lng + gmIfrE;
        }, () => {
            console.log('User denied access to location');
        });
    } else {
        // Browser doesn't support Geolocation
        console.log('Your browser does not support Geolocation');
    }
}


/************************** PWA SERVICE WORKER INIT **************************/

// Registering the service worker for the pwa
// NOTE
// Even though this service worker is not on the root of this web application
// It has been configured, through swing_main.py to make it look like it is.


// Instance of Local Storage to retrieve SW Version
const swStore = localforage.createInstance({
    name: 'swingcms-sw'
});


// Evaluate if Browser accepts Service Workers
if ('serviceWorker' in navigator) {
    const wb = new Workbox('/sw.js', { scope: '/' });
    // Detects an update for the app's content and prompts user to refresh
    wb.addEventListener('installed', event => {
        // Retrieve SW version
        let swVerEl = document.querySelector('#s-version');
        if (swVerEl) {
            swStore.getItem('swVersion').then( (val) => {
                swVerEl.textContent = val;
            });
        }

        if (event.isUpdate) {
            console.log('App update found...');
            initSnackbar(snackbar, updateSBDataObj);
        }
    });
    // Registers the Workbox Service Worker
    wb.register();
}


// Add to Homescreen (A2H) Event
let deferredPrompt;
var appIsInstalled = false;

// Snackbar A2H Data for Install Event
const installSBDataObj = {
    message: '¿Deseas Instalar nuestra App? (¡Gratis!)',
    actionText: 'Si',
    timeout: 10000,
    actionHandler: () => {
        console.log('Installing app (A2H)...');
        // Show the prompt
        deferredPrompt.prompt();
        // Wait for the user action
        deferredPrompt.userChoice
            .then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the A2H prompt');
                    appIsInstalled = true;
                } else {
                    console.log('User dismissed the A2H prompt');
                }
                deferredPrompt = null;
            });
    }
};


// Snackbar Data for Update Website Event
const updateSBDataObj = {
    message: '¡Nuevo contenido disponible!. Click OK para actualizar.',
    actionText: 'OK',
    timeout: 10000,
    actionHandler: () => {
        console.log('Updating app...');
        // Refresh the app
        window.location.reload();
    }
};


window.addEventListener('appinstalled', (evt) => {
    console.log('App is installed...');
    appIsInstalled = true;
});


window.addEventListener('beforeinstallprompt', (e) => {
    console.log('Prompting to install app...');
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Show the Snackbar popup to Install
    if (!appIsInstalled) {
        initSnackbar(snackbar, installSBDataObj);
    }
});


// Show SW Version
let swVerEl = document.querySelector('#s-version');
if (swVerEl) {
    // Retrieve SW version
    swStore.getItem('swVersion').then( (val) => {
        if (val) {
            swVerEl.textContent = val;
        }
    });
}
