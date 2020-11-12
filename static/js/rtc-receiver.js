/************************** WEBRTC RECEIVER **************************/
var peer;
/* Allow 'window' context to reference the function */
window.peer = peer;

var enableOfflineMsgs = true;
/* Allow 'window' context to reference the function */
window.enableOfflineMsgs = enableOfflineMsgs;

// Initiator Room ID
const iRID = { 'id' : '' };

// MDC Dialog - End RTC
var mdcEndRTCDialogEl = null;

function initializeRTC() {
    console.log('Initializing SocketIO/SimplePeer');

    const socket = io({
        query: 'photoURL=' + encodeURIComponent(advStreams.myUserInfo.photoURL)
    });
    /* Allow 'window' context to reference the function */
    window.socket = socket;
    
    socket.on('connect', function() {
        console.log('Connected - My Socket ID: ' + socket.id);
    });
    
    socket.on('disconnect', function() {
        console.log('Disconnected - My Socket ID: ' + socket.id);
    });
    
    socket.on('userIsConnected', (data) => {
        console.log('I am online: ' + data.id);
        advStreams.myUserInfo.id = data.id;
        advStreams.myUserInfo.roles = data.roles;
    });

    socket.on('receiveInitiatorOffer', (data) => {
        console.log('Received Offer');
        console.log(data);
        iRID.id = data.r_id;
        if (peer == null || peer.destroyed) {
            establishRTC();
        }
        peer.signal(data.data);
    });
}

// Stablish WebRTC with Selected User
var isInitialSignal = true;
function establishRTC() {
    console.log('Establish Receiver Peer');
    peer = new SimplePeer({
        config: {
            iceServers: [
                {
                    urls: [
                        // 'stun:global.stun.twilio.com:3478',
                        'stun:stun.l.google.com:19302'
                    ]
                },{
                    urls: [
                        // 'turn:relay.backups.cz?transport=tcp',
                        'turn:relay.backups.cz'
                    ],
                    credential: 'webrtc',
                    username: 'webrtc'
                }
            ]
        },
        initiator: false,
        trickle: false
    });

    peer.on('error', err => {
        console.log('error', err);
        swcms.showUserRTCConSnackbar('err', err);
    });
    
    peer.on('signal', (data) => {
        console.log('Receiver Signaling Started');
        console.log(data);
        socket.emit('sendAnswerToUser', JSON.stringify({ 'r_id' : iRID.id, 'data' : data}));
        if (isInitialSignal) {
            swcms.showUserRTCConSnackbar('con');
            isInitialSignal = false;
        }
    });
    
    peer.on('connect', () => {
        console.log('Receiver Connected');
        let userData = swcms.advStreams.myUserInfo;
    
        peer.send(JSON.stringify({
            msgType: 'welcome',
            msgUserInfo: userData
        }));
    });
    
    peer.on('close', () => {
        console.log('Peer Disconnected');
        let chatContainer = document.querySelector('.container-chat--body-messages');
        let loaderElem = document.querySelector('.s-loader');
        let userName = document.querySelector('.container-chat--topbar-info-data-name').textContent;
        document.querySelector('.container-chat--topbar-info-data-status-icon').classList.remove('s-font-color-chat-online');
        document.querySelector('.container-chat--topbar-info-data-status-icon').classList.add('s-font-color-chat-offline');
        document.querySelector('.container-chat--topbar-info-data-status-text').textContent = 'Offline';
        document.querySelector('.container-chat--topbar-info-data-status-text').classList.remove('s-font-color-primary');
        document.querySelector('.container-chat--topbar-info-data-status-text').classList.add('s-font-color-secondary');
        swcms.appendChatMessage(userName + ' Offline.', null, 'auto');
        swcms.appendChatMessage('Esperando conexión...', null, 'auto');
        chatContainer.appendChild(loaderElem);
        loaderElem.classList.remove('container--hidden');
        chatContainer.scrollTop = chatContainer.scrollHeight;
        swcms.showUserRTCConSnackbar('dcon');
        isInitialSignal = true;
    });
    
    peer.on('data', (data) => {
        console.log('Initiator Data Received: ' + data);
        jMsg = JSON.parse(data);
        switch (jMsg.msgType) {
            case 'audio':
            case 'audiovideo':
                if (jMsg.msg == 'accepted') {
                    swcms.managePeerStream('send');
                } else if (jMsg.msg == 'ended') {
                    swcms.endAVCall(false);
                }
                swcms.displayCallUI(jMsg.msg, jMsg.msgType);
                break;
            
            case 'endRTC':
                peer.destroy();
                if (jMsg.showUSS) {
                    mdcEndRTCDialogEl.open();
                }
                document.querySelector('.container-chat--body-messages').textContent = '';
                break;
    
            case 'msg':
                swcms.appendChatMessage(jMsg.msg, jMsg.msgDateTime, 'others', jMsg.msgUserName);
                break;
    
            case 'welcome':
                swcms.advStreams.otherUserInfo = jMsg.msgUserInfo;
                document.querySelector('#chat-pic').src = jMsg.msgUserInfo.photoURL;
                document.querySelector('#callerid-pic').src = jMsg.msgUserInfo.photoURL;
                document.querySelector('#callerid-name').textContent = jMsg.msgUserInfo.name;
                document.querySelector('.s-loader').classList.add('container--hidden');
                document.querySelector('.container-chat--topbar-info-data-name').textContent = jMsg.msgUserInfo.name;
                document.querySelector('.container-chat--topbar-info-data-status-icon').classList.remove('s-font-color-chat-offline');
                document.querySelector('.container-chat--topbar-info-data-status-icon').classList.add('s-font-color-chat-online');
                document.querySelector('.container-chat--topbar-info-data-status-text').textContent = 'Online';
                document.querySelector('.container-chat--topbar-info-data-status-text').classList.remove('s-font-color-secondary');
                document.querySelector('.container-chat--topbar-info-data-status-text').classList.add('s-font-color-primary');
                swcms.appendChatMessage(jMsg.msgUserInfo.name + ' Online.', null, 'auto');
                swcms.sendOfflineMsgs();
                break;
        }
    });
    
    peer.on('stream', (stream) => {
        swcms.setAVStream(stream);
    });
}


/************************** FUNCTIONS **************************/

// Save user satisfaction ratings
const usrSatAnswers = { 1: null, 2: null};
function saveRating(elmID, index) {
    let i = 0
    let elm = document.getElementById(elmID);
    let question = elm.getAttribute('data-action-fn-val');
    elm.querySelectorAll('.mdc-list-item').forEach((el) => {
        if (i == index) {
            el.classList.add('mdc-list-item--selected');
        } else {
            el.classList.remove('mdc-list-item--selected');
        }
        i++;
    });
    usrSatAnswers[question] = index;
}
