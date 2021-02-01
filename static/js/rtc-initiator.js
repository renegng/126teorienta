/************************** WEBRTC INITIATOR **************************/
var peer;
/* Allow 'window' context to reference the function */
window.peer = peer;

var currPeerObj;

var enableMsgDBStore = true;
/* Allow 'window' context to reference the function */
window.enableMsgDBStore = enableMsgDBStore;

var enableOfflineMsgs = false;
/* Allow 'window' context to reference the function */
window.enableOfflineMsgs = enableOfflineMsgs;

// RTC Connections
var rtcConnections = [];

// Initiator Room ID
const iRID = { 'id' : '' };

// MDC Dialog - Assigned, Disconnected, Transfer
var mdcAssignedDialogEl = null;
var mdcDisconnectedDialogEl = null;
var mdcTransferDialogEl = null;

function initializeRTC () {
    console.log('Initializing SocketIO/SimplePeer');

    const socket = io({
        query: 'photoURL=' + encodeURIComponent(swcms.advStreams.myUserInfo.photoURL)
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
        swcms.advStreams.myUserInfo.id = data.id;
        swcms.advStreams.myUserInfo.roles = data.roles;
    });

    socket.on('RTCUserList', (data) => {
        console.log('RTC User List Received');
        console.log(data);
        showRTCUserList(data);
    });

    // When connecting to a Receiver Peer
    socket.on('receiveReceiverAnswer', (data) => {
        console.log('Received Answer');
        console.log(data);
        peer.signal(data.data);
    });

    // When connecting to an Initiator Peer
    socket.on('receiveInitiatorOffer', (data) => {
        console.log('Received Offer');
        console.log(data);
        iRID.id = data.r_id;
        establishRTC(false, data.data);
    });

    // Receive a User Transferral
    socket.on('userTransferNotification', (data) => {
        console.log('Received User Transferral');
        console.log(data);
        swcms.showUserRTCConSnackbar('trnRcv', data.usr_name);
    });

    // Receive Heartbeat to keep app alive in the background
    socket.on('receiveHeartbeat', (data) => {
        console.log('Received Heartbeat');
        console.log(data);
    });

    // Receive Conversation ID
    socket.on('setConversationId', (data) => {
        console.log('Conversation Info Retrieved');
        let convPeer = null;
        rtcConnections.forEach((con) => {
            if (con.rid == data.rid) {
                con.peer.cid = data.cid;
                convPeer = con.peer;
            }
        });
        if (convPeer) {
            convPeer.sendWelcomeData();
            getConversationMessages(convPeer.cid, 'current', convPeer.uid);
        }
    });

    // Receive Conversation Messages
    socket.on('setConversationMessages', (data) => {
        console.log('Conversation Messages Retrieved');
        console.log(data);
        showConversationMessages(data.users, data.messages, data.uidElm);
    });
}

// SimplePeer User Connection Class
class rtcPeerConnection {
    constructor(init, uListElem) {
        this.convId = null;
        this.isInitiator = init;
        this.uListElem = uListElem;
        this.isInitialSignal = true;

        this.rtcSimplePeer = new SimplePeer({
            config: {
                iceServers: [
                    {
                        urls: [
                            'stun:stun.rxdbit.com'
                        ]
                    },{
                        urls: [
                            'turn:turn.rxdbit.com'
                        ],
                        credential: 'cotnection',
                        username: 'cotusr'
                    }
                ]
            },
            initiator: this.isInitiator,
            trickle: true
        });

        this.rtcSimplePeer.on('signal', (data) => {
            console.log(data);
            if (this.isInitiator) {
                console.log('Initiator Signaling Started');
                socket.emit('sendOfferToUser', JSON.stringify({
                    'r_id': this.uListElem.getAttribute('data-meta-rid'),
                    'data': data
                }));
            } else {
                console.log('Receiver Signaling Started');
                socket.emit('sendAnswerToUser', JSON.stringify({
                    'r_id': iRID.id,
                    'data': data
                }));
            }
            
            if (this.isInitialSignal) {
                this.isInitialSignal = false;
                swcms.showUserRTCConSnackbar('con', this.uListElem.querySelector('.mdc-list-item__primary-text').textContent);
            }
        });
    
        this.rtcSimplePeer.on('error', (err) => {
            console.log('error', err);
            let newRTCConnections = [];
            
            // Remove Peer from Array of Connections
            rtcConnections.forEach((con) => {
                if (con.rid != this.uListElem.getAttribute('data-meta-rid')) {
                    newRTCConnections.push(con);
                }
            });
    
            rtcConnections = newRTCConnections;
            swcms.showUserRTCConSnackbar('err', err);
        });
        
        this.rtcSimplePeer.on('connect', () => {
            console.log('Initiator Connected');

            let utype = this.uListElem.getAttribute('data-meta-utype');
            let uid = (utype != 'anon')? parseInt(this.uListElem.getAttribute('data-meta-uid')) : this.uListElem.getAttribute('data-meta-rid');
            let upic = this.uListElem.querySelector('.mdc-list-item__graphic').src;

            socket.emit('getConversationId', JSON.stringify({
                'u_id': uid,
                'u_ip': this.uListElem.getAttribute('data-meta-ip'),
                'u_rid': this.uListElem.getAttribute('data-meta-rid'),
                'u_type': utype,
                'u_name': this.uListElem.querySelector('.mdc-list-item__primary-text').textContent,
                'u_photoURL': upic,
                'e_id': swcms.advStreams.myUserInfo.id,
                'e_name': swcms.advStreams.myUserInfo.name,
                'e_photoURL': swcms.advStreams.myUserInfo.photoURL
            }));
        });
        
        this.rtcSimplePeer.on('close', () => {
            console.log('Peer Disconnected');
            let newRTCConnections = [];
            
            // Remove Peer from Array of Connections
            rtcConnections.forEach((con) => {
                if (con.rid != this.uListElem.getAttribute('data-meta-rid')) {
                    newRTCConnections.push(con);
                }
            });
    
            rtcConnections = newRTCConnections;
            swcms.showUserRTCConSnackbar('dcon', this.uListElem.querySelector('.mdc-list-item__primary-text').textContent);
            enableRTCUserList();
        });
        
        this.rtcSimplePeer.on('data', (data) => {
            console.log('Initiator Data Received: ' + data);
            let utype = this.uListElem.getAttribute('data-meta-utype');
            let uid = (utype != 'anon')? this.uListElem.getAttribute('data-meta-uid') : this.uListElem.getAttribute('data-meta-rid');
            let upic = this.uListElem.querySelector('.mdc-list-item__graphic').src;
            let jMsg = JSON.parse(data);
            switch (jMsg.msgType) {
                case 'audio':
                case 'audiovideo':
                    if (!this.uListElem.classList.contains('mdc-list-item--selected')) {
                        this.uListElem.click();
                    }
                    if (jMsg.msg == 'accepted') {
                        swcms.managePeerStream('send');
                    } else if (jMsg.msg == 'ended') {
                        swcms.endAVCall(false);
                    }
                    swcms.displayCallUI(jMsg.msg, jMsg.msgType);
                    break;
                
                case 'endRTC':
                    this.rtcSimplePeer.destroy();
                    showConversationUI(false, this.uListElem);
                    break;
        
                case 'msg':
                    let rtcUserList = '';
                    switch (utype) {
                        case 'anon':
                            rtcUserList = document.querySelector('#anon-active-rooms');
                            break;
                        case 'emp':
                            rtcUserList = document.querySelector('#emp-active-rooms');
                            break;
                        case 'reg':
                            rtcUserList = document.querySelector('#reg-active-rooms');
                            break;
                    }
                    swcms.appendChatMessage(jMsg.msg, jMsg.msgDateTime, 'others', jMsg.msgUserName, uid, upic);
                    if (!this.uListElem.classList.contains('mdc-list-item--selected')) {
                        this.uListElem.querySelector('.mdc-list-item__meta').classList.remove('container--hidden');
                    }
                    storeConvMsg((utype != 'anon')? parseInt(uid) : uid, jMsg.msg, jMsg.msgDateTime, this.rtcSimplePeer, this.convId, utype);
                    let nxtElm = rtcUserList.querySelector('.container-chat--sidemenu-rooms-usertype-header');
                    nxtElm.after(this.uListElem);
                    break;
                
                case 'typ':
                    if (this.uListElem.classList.contains('mdc-list-item--selected')) {
                        if (jMsg.msg) {
                            document.querySelector('.container-chat--body-message-istyping').classList.remove('container--hidden');
                        } else {
                            document.querySelector('.container-chat--body-message-istyping').classList.add('container--hidden');
                        }
                    }
                    break;
        
                case 'welcome':
                    hideRTCMessagesLoader(uid);
                    rtcConnections.forEach((con) => {
                        if (con.rid == this.uListElem.getAttribute('data-meta-rid')) {
                            con.userInfo = jMsg.msgUserInfo;
                        }
                    });
                    swcms.advStreams.otherUserInfo = jMsg.msgUserInfo;
                    swcms.appendChatMessage(jMsg.msgUserInfo.name + ' Online.', null, 'auto', '', uid);
                    socket.emit('updateUsersStatus', JSON.stringify({
                        'e_id': swcms.advStreams.myUserInfo.id,
                        's_type': 'busy',
                        'u_id': this.uListElem.getAttribute('data-meta-rid'),
                        'u_type': utype
                    }));
                    break;
            }
        });
        
        this.rtcSimplePeer.on('stream', (stream) => {
            console.log('Setting Remote Stream');
            swcms.setAVStream(stream);
        });
    }

    get cid() {
        return this.convId;
    }

    get peerConnection() {
        return this.rtcSimplePeer;
    }

    get uid() {
        let utype = this.uListElem.getAttribute('data-meta-utype');
        let uid = (utype != 'anon')? this.uListElem.getAttribute('data-meta-uid') : this.uListElem.getAttribute('data-meta-rid');
        return uid;
    }

    set cid(id) {
        this.convId = id;
    }

    sendWelcomeData() {
        console.log('Sending Welcome Data');
        let userData = Object.assign({}, swcms.advStreams.myUserInfo);

        if (this.uListElem.getAttribute('data-meta-uid') == 2) {
            userData.name = 'Agente 126';
            userData.photoURL = '/static/images/manifest/agent_f.svg';
        }

        this.rtcSimplePeer.send(JSON.stringify({
            'msgType': 'welcome',
            'msgUserInfo': userData
        }));

        enableRTCUserList();
    }
}

// Stablish WebRTC with Selected User
function establishRTC(init = true, receiverData = null) {
    console.log('Establish Initiator Peer');
    let uListElem;
    if (init) {
        uListElem = this;
    } else {
        document.querySelectorAll('.container-chat--sidemenu-rooms-usertype').forEach((cont) => {
            let qry = 'li:not(.container-chat--sidemenu-rooms-usertype-header):not(.container-chat--sidemenu-rooms-usertype-empty)';
            cont.querySelectorAll(qry).forEach((elm) => {
                if (elm.getAttribute('data-meta-rid') == iRID.id)
                    uListElem = elm;
            });
        });
    }

    // Check if assigned to someone else - BUSY or TRANSFERED status
    let isUserAssigned = checkUserAssignment(uListElem);
    if (isUserAssigned) {
        mdcAssignedDialogEl.open();
        return;
    }
    
    // If peer is as initiator, Show Conversation UI
    if (init) {
        // Show Conversation UI
        showConversationUI(true, uListElem);
    }
    
    // Check if peer connection already exists
    let existsPeer = checkPeerExists(uListElem.getAttribute('data-meta-rid'));
    if (existsPeer) {
        // If Peer was started as Receiver we send a signal
        if (receiverData) {
            peer.signal(receiverData);
        }
        return;
    }

    // Create new RTC Simple Peer Connection
    // Disable RTC User List until Connection to prevent parallel offers/answers
    let newPeer = new rtcPeerConnection(init, uListElem);
    enableRTCUserList(false);
    
    // If Peer was started as Receiver we send a signal
    if (receiverData) {
        newPeer.peerConnection.signal(receiverData);
    }

    // Add Peer Connection to Array of Connections
    console.log('Adding Peer to Connections Array');
    rtcConnections.push({
        'peer': newPeer,
        'rid': uListElem.getAttribute('data-meta-rid'),
        'userInfo': ''
    });

    // Set Newly Created Peer as the Current Peer
    if (uListElem.classList.contains('mdc-list-item--selected')) {
        currPeerObj = newPeer;
        peer = currPeerObj.peerConnection;
    }
}


/************************** FUNCTIONS **************************/


// Keep app active in the background with a Heartbeat
var timeInBack = 0;
var heartBeatIntv = null;
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState == 'visible') {
        if (heartBeatIntv) {
            window.clearInterval(heartBeatIntv);
            heartBeatIntv = null;
            // If connection was lost, display Dialog
            if (socket.disconnected) {
                document.getElementById('d-disconnected-inactivity').textContent = timeInBack;
                mdcDisconnectedDialogEl.open();
            }
            timeInBack = 0;
        }
    }
    if (document.visibilityState == 'hidden') {
        heartBeatIntv = window.setInterval(() => {
            timeInBack++;
            // After 8 seconds, send a Heartbeat.
            if ((timeInBack % 8) == 0) {
                if (socket && socket.connected) {
                    socket.emit('heartbeat', JSON.stringify({ 'hb': swcms.advStreams.myUserInfo.id }));
                }
            }
        }, 1000);
    }
});
// Close SocketIO connection on window close
window.addEventListener('beforeunload', () => {
    if (socket && socket.connected) {
        console.log('Closing Socket Connection...');
        socket.io.disconnect();
    }
}, false);

// Side menu responsive UI
if (document.querySelector('.container-chat--sidemenu')) {
    let backButtonEl = document.querySelector('.container-chat--topbar-info-back');
    let chatBodyEl = document.querySelector('.container-chat--body');
    let chatFooterEl = document.querySelector('.container-chat--footer');
    let chatNoConver = document.querySelector('.container-chat--no-conversation');
    let chatTopBarEl = document.querySelector('.container-chat--topbar');
    let sideMenuEl = document.querySelector('.container-chat--sidemenu');

    const initCollapsibleSideMenu = () => {
        if (document.querySelector('.container-chat--body-messages-active')){
            chatNoConver.classList.add('container--hidden');
            chatBodyEl.classList.remove('container--hidden');
            chatFooterEl.classList.remove('container--hidden');
            chatTopBarEl.classList.remove('container--hidden');
            backButtonEl.classList.remove('container--hidden');
            sideMenuEl.classList.add('container--hidden');
        } else {
            chatBodyEl.classList.add('container--hidden');
            chatFooterEl.classList.add('container--hidden');
            chatNoConver.classList.add('container--hidden');
            chatTopBarEl.classList.add('container--hidden');
            backButtonEl.classList.remove('container--hidden');
            sideMenuEl.classList.remove('container--hidden');
        }
    }

    const initPermanentSideMenu = () => {
        if (document.querySelector('.container-chat--body-messages-active')){
            backButtonEl.classList.add('container--hidden');
            chatNoConver.classList.add('container--hidden');
            chatBodyEl.classList.remove('container--hidden');
            chatFooterEl.classList.remove('container--hidden');
            chatTopBarEl.classList.remove('container--hidden');
            sideMenuEl.classList.remove('container--hidden');
        } else {
            backButtonEl.classList.add('container--hidden');
            chatBodyEl.classList.add('container--hidden');
            chatFooterEl.classList.add('container--hidden');
            chatTopBarEl.classList.add('container--hidden');
            chatNoConver.classList.remove('container--hidden');
            sideMenuEl.classList.remove('container--hidden');
        }
    }

    let sideMenu = window.matchMedia("(max-width: 37.49em)").matches ? initCollapsibleSideMenu() : initPermanentSideMenu();

    // Toggle between permanent sidemenu and collapsible sidemenu at breakpoint 37.5em
    const resizeSideMenuHandler = () => {
        if (window.matchMedia("(max-width: 37.49em)").matches) {
            sideMenu = initCollapsibleSideMenu();
        } else if (window.matchMedia("(min-width: 37.5em)").matches) {
            sideMenu = initPermanentSideMenu();
        }
    }

    window.addEventListener('resize', resizeSideMenuHandler);
}

// Add RTC User to User List
function appendRTCUser(room_id, user, uType) {
    let uid;
    let userContainer;
    // Anonymous containers ID are Room IDs, all others are IDs
    if (uType == 'anon') {
        uid = room_id;
    } else {
        uid = user.id;
    }
    userContainer = document.getElementById('l_' + uid);
    // If there is no container, user is a new one
    if (!userContainer) {
        userContainer = createRTCListUserContainer(uType);
        createRTCMessagesUserContainer(room_id, user, uType);
    }
    setRTCUserContainer(userContainer, room_id, user, uType);
    updateRTCUserStatus(uid, user.userInfo.status);
}

// Add RTC User to User Transfer List
function appendRTCTransferList(user) {
    let uid = user.id;
    let userContainer = document.getElementById('tl_' + uid);
    
    // If there is no container, user is a new one
    if (!userContainer) {
        userContainer = createRTCListUserContainer('rtcTransferList');
    }
    setRTCUserTransferContainer(userContainer, user);
    setUserStatusColor(userContainer.querySelector('.mdc-list-item__graphic-status'), user.userInfo.status);
}

// Check if Peer Exists and Assign it to Peer if available
function checkPeerExists(rid) {
    let val = false;

    rtcConnections.forEach((con) => {
        if (con.rid == rid && !con.peer.peerConnection.destroyed) {
            swcms.advStreams.otherUserInfo = con.userInfo;
            currPeerObj = con.peer;
            peer = currPeerObj.peerConnection;
            val = true;
        }
    });

    return val;
}

// Check if User is assigned to someone else
function checkUserAssignment(uListElem) {
    let val = false;
    let aid = uListElem.getAttribute('data-meta-assigned');
    let ustat = uListElem.getAttribute('data-meta-status');

    if (aid && aid != swcms.advStreams.myUserInfo.id && ustat != 'Disponible') {
        let ename = '';
        let uname = uListElem.querySelector('.mdc-list-item__primary-text').textContent;

        document.querySelectorAll('.container-chat--sidemenu-rooms-usertype').forEach((cont) => {
            let qry = 'li:not(.container-chat--sidemenu-rooms-usertype-header):not(.container-chat--sidemenu-rooms-usertype-empty)';
            cont.querySelectorAll(qry).forEach((elm) => {
                if (elm.getAttribute('data-meta-uid') == aid) {
                    ename = elm.querySelector('.mdc-list-item__primary-text').textContent;
                }
            });
        });

        document.getElementById('d-assigned-empname').textContent = ename;
        document.getElementById('d-assigned-usrname').textContent = uname;
        document.getElementById('d-assigned-status').textContent = ustat;
        setUserStatusColor(document.getElementById('d-assigned-status'), ustat);

        val = true;
    }

    return val;
}

// Create RTC User List Element
function createRTCListUserContainer(parentContainer) {
    let userContainer = document.createElement('li');
    let ripple = document.createElement('span');
    let userPhoto = document.createElement('img');
    let userStatus = document.createElement('i');
    let textContainer = document.createElement('span');
    let userName = document.createElement('span');
    let userInfo = document.createElement('span');
    let metaContainer = document.createElement('span');

    userContainer.classList.add('mdc-list-item');
    ripple.classList.add('mdc-list-item__ripple');
    userPhoto.classList.add('mdc-list-item__graphic');
    userStatus.classList.add('material-icons', 'mdc-list-item__graphic-status', 's-font-color-chat-online');
    textContainer.classList.add('mdc-list-item__text');
    userName.classList.add('mdc-list-item__primary-text');
    userInfo.classList.add('mdc-list-item__secondary-text', 'mdc-typography--caption');
    metaContainer.classList.add('mdc-list-item__meta');

    userStatus.textContent = 'stop_circle';

    if (parentContainer == 'rtcTransferList') {
        let radioInput = document.createElement('input');
        let radioBack = document.createElement('span');
        let radioOuter = document.createElement('span');
        let radioInner = document.createElement('span');
        let radioRipple = document.createElement('span');

        radioInput.classList.add('mdc-radio__native-control');
        radioBack.classList.add('mdc-radio__background');
        radioOuter.classList.add('mdc-radio__outer-circle');
        radioInner.classList.add('mdc-radio__inner-circle');
        radioRipple.classList.add('mdc-radio__ripple');

        radioInput.setAttribute('type', 'radio');
        radioInput.setAttribute('name', 'd-transfer-radios');
        userContainer.setAttribute('role', 'radio');
        userContainer.setAttribute('aria-checked', 'false');

        radioBack.appendChild(radioOuter);
        radioBack.appendChild(radioInner);
        metaContainer.appendChild(radioInput);
        metaContainer.appendChild(radioBack);
        metaContainer.appendChild(radioRipple);
    } else {
        let notification = document.createElement('i');

        notification.classList.add('material-icons', 's-font-color-primary');
        notification.textContent = 'notification_important';

        metaContainer.classList.add('container--hidden');
        metaContainer.appendChild(notification);
    }

    textContainer.appendChild(userName);
    textContainer.appendChild(userInfo);
    userContainer.appendChild(ripple);
    userContainer.appendChild(userPhoto);
    userContainer.appendChild(userStatus);
    userContainer.appendChild(textContainer);
    userContainer.appendChild(metaContainer);

    switch (parentContainer) {
        case 'anon':
            userContainer.addEventListener('click', establishRTC);
            document.querySelector('#anon-active-rooms').appendChild(userContainer);
            break;
        case 'emp':
            userContainer.addEventListener('click', establishRTC);
            document.querySelector('#emp-active-rooms').appendChild(userContainer);
            break;
        case 'reg':
            userContainer.addEventListener('click', establishRTC);
            document.querySelector('#reg-active-rooms').appendChild(userContainer);
            break;
        case 'rtcTransferList':
            userContainer.setAttribute('tabindex', '0');
            document.querySelector('#transfer-list').appendChild(userContainer);
            break;
    }
    
    return userContainer;
}

// Create RTC User Messages Element
function createRTCMessagesUserContainer(room_id, user, uType) {
    let userContainer = document.createElement('div');
    let loader = document.createElement('div');
    let bounce1 = document.createElement('div');
    let bounce2 = document.createElement('div');
    let bounce3 = document.createElement('div');
    let prevMsgs = document.createElement('div');

    userContainer.classList.add('container-chat--body-messages', 'container-chat--body-messages-hidden');
    loader.classList.add('s-loader');
    bounce1.classList.add('s-loader-bounce1');
    bounce2.classList.add('s-loader-bounce2');
    bounce3.classList.add('s-loader-bounce3');
    prevMsgs.classList.add('container-chat--body-messages-load');

    loader.appendChild(bounce1);
    loader.appendChild(bounce2);
    loader.appendChild(bounce3);

    userContainer.appendChild(prevMsgs);
    userContainer.appendChild(loader);

    userContainer.id = (uType == 'anon')? 'm_' + room_id : 'm_' + user.id;

    let isTypingEl = document.querySelector('.container-chat--body-message-istyping');
    document.querySelector('.container-chat--body').insertBefore(userContainer, isTypingEl);

    return userContainer;
}

// Enable or Disable RTC User List to prevent connection issues
function enableRTCUserList(enable = true){
    document.querySelectorAll('.container-chat--sidemenu-rooms-usertype').forEach((cont) => {
        let qry = 'li:not(.container-chat--sidemenu-rooms-usertype-header):not(.container-chat--sidemenu-rooms-usertype-empty)';
        cont.querySelectorAll(qry).forEach((elm) => {
            if (enable) {
                elm.classList.remove('container--disable-click');
            } else {
                elm.classList.add('container--disable-click');
            }
        });
    });
}

// End RTC User Session
function endRTCSession(showUsrSatSurv = false) {
    let usrElem = null;
    document.querySelectorAll('.container-chat--sidemenu-rooms-usertype').forEach((cont) => {
        if (cont.querySelector('.mdc-list-item--selected')) {
            usrElem = cont.querySelector('.mdc-list-item--selected');
        };
    });

    let r_id = usrElem.getAttribute('data-meta-rid');
    let u_type = usrElem.getAttribute('data-meta-utype');
    let uid = (u_type == 'anon')? r_id : usrElem.getAttribute('data-meta-uid');

    if (!peer.destroyed && peer.connected) {
        peer.send(JSON.stringify({
            'msgType': 'endRTC',
            'showUSS': showUsrSatSurv
        }));
        peer.destroy();
    }

    socket.emit('endRTC', JSON.stringify({
        'e_id': swcms.advStreams.myUserInfo.id,
        'u_id': r_id,
        'u_type': u_type
    }));
    showConversationUI(false, usrElem);
    // If the user is not an Employee, remove the user from the list
    if (u_type == 'anon' || u_type == 'reg'){
        document.getElementById('m_' + uid).remove();
        usrElem.remove();
    }
    enableRTCUserList();
}

// Filter RTC User List
var lastRTCFilterVal = 'all';
function filterRTCUserList(value) {
    let qry = 'li:not(.container-chat--sidemenu-rooms-usertype-header):not(.container-chat--sidemenu-rooms-usertype-empty)';
    switch (value) {
        case 'all':
            document.querySelectorAll('.container-chat--sidemenu-rooms-usertype').forEach((cont) => {
                cont.querySelectorAll(qry).forEach((elm) => {
                    elm.classList.remove('container--hidden');
                });
                cont.classList.remove('container--hidden');
            });
            break;
        case 'anon':
            document.querySelectorAll('.container-chat--sidemenu-rooms-usertype').forEach((cont) => {
                if (cont.getAttribute('id') == 'anon-active-rooms') {
                    cont.querySelectorAll(qry).forEach((elm) => {
                        elm.classList.remove('container--hidden');
                    });
                    cont.classList.remove('container--hidden');
                } else {
                    cont.classList.add('container--hidden');
                }
            });
            break;
        case 'emp':
            document.querySelectorAll('.container-chat--sidemenu-rooms-usertype').forEach((cont) => {
                if (cont.getAttribute('id') == 'emp-active-rooms') {
                    cont.querySelectorAll(qry).forEach((elm) => {
                        elm.classList.remove('container--hidden');
                    });
                    cont.classList.remove('container--hidden');
                } else {
                    cont.classList.add('container--hidden');
                }
            });
            break;
        case 'reg':
            document.querySelectorAll('.container-chat--sidemenu-rooms-usertype').forEach((cont) => {
                if (cont.getAttribute('id') == 'reg-active-rooms') {
                    cont.querySelectorAll(qry).forEach((elm) => {
                        elm.classList.remove('container--hidden');
                    });
                    cont.classList.remove('container--hidden');
                } else {
                    cont.classList.add('container--hidden');
                }
            });
            break;
        case 'mine':
            document.querySelectorAll('.container-chat--sidemenu-rooms-usertype').forEach((cont) => {
                let hasMine = false;
                cont.querySelectorAll(qry).forEach((elm) => {
                    if (elm.getAttribute('data-meta-assigned') == swcms.advStreams.myUserInfo.id) {
                        elm.classList.remove('container--hidden');
                        hasMine = true;
                    } else {
                        elm.classList.add('container--hidden');
                    }
                });
                if (!hasMine) {
                    cont.classList.add('container--hidden');
                }
            });
            break;
    }
    lastRTCFilterVal = value;
}

// Filter RTC User Transfer List
function filterRTCUserTransferList(txt) {
    document.querySelectorAll('#transfer-list > li').forEach((elm) => {
        let userName = elm.querySelector('.mdc-list-item__primary-text').textContent;
        let userRole = elm.querySelector('.mdc-list-item__secondary-text').textContent;

        // Removes special characters, start/end spaces and uppercases from all names to compare
        let userNameNorm = userName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        let userRoleNorm = userRole.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        let userTextNorm = txt.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, "");

        if (userNameNorm.includes(userTextNorm) || userRoleNorm.includes(userTextNorm)) {
            elm.classList.remove('container--hidden');
        } else {
            elm.classList.add('container--hidden');
        }
    });
}
if (document.querySelector('#d-transfer-ufilter-input')) {
    document.querySelector('#d-transfer-ufilter-input').addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter') {
            evt.preventDefault();
        }
    });
    document.querySelector('#d-transfer-ufilter-input').addEventListener('keyup', () => {
        filterRTCUserTransferList(document.querySelector('#d-transfer-ufilter-input').value);
    });
}

// Retrieve Conversation Messages
function getConversationMessages(cid, date, uidElm) {
    console.log('Retrieving Messages...');
    if (cid && date) {
        let jsn = JSON.stringify({
            'c_date': date,
            'uidElm': uidElm
        });
        socket.emit('getConversationMessages', {
            'cid': cid,
            'data': jsn
        });
    }
}

// Hide RTC User Message Container Loader
function hideRTCMessagesLoader(uid) {
    let msgContainer = document.getElementById('m_' + uid);
    let loaderElem = msgContainer.querySelector('.s-loader');
    
    loaderElem.classList.add('container--hidden');
}

// More Options Menu Selected Option
function moreOptionsSelection(index) {
    switch (index) {
        // Transfer
        case 0:
            mdcTransferDialogEl.open();
            break;
        // End Chat with User Satisfaction Survey
        case 1:
            endRTCSession(true);
            break;
        // End Chat without Survey
        case 2:
            endRTCSession();
            break;
    }
}

// Set RTC User List Container Data
function setRTCUserContainer(container, room_id, user, uType) {
    let userInfo = user.userInfo;
    let activityTime = returnFormatDate(new Date(userInfo.activity - (new Date().getTimezoneOffset()*60000)));
    let userName = (uType != 'anon')? userInfo.name : userInfo.name + ((userInfo.ip)? ' - ' + userInfo.ip : '');
    let userPhoto = (userInfo.photoURL)? decodeURIComponent(userInfo.photoURL) : '/static/images/manifest/user_f.svg';

    container.id = (uType == 'anon')? 'l_' + room_id : 'l_' + user.id;
    container.setAttribute('data-meta-assigned', (userInfo.assignedTo)? userInfo.assignedTo : '');
    container.setAttribute('data-meta-ip', userInfo.ip);
    container.setAttribute('data-meta-rid', room_id);
    container.setAttribute('data-meta-roles', userInfo.roles);
    container.setAttribute('data-meta-status', userInfo.status);
    container.setAttribute('data-meta-uid', user.id);
    container.setAttribute('data-meta-utime', activityTime);
    container.setAttribute('data-meta-utype', uType);
    container.querySelector('.mdc-list-item__graphic').src = userPhoto;
    container.querySelector('.mdc-list-item__primary-text').textContent = userName;

    if (userInfo.assignedTo && userInfo.assignedTo == swcms.advStreams.myUserInfo.id && userInfo.status == 'Transferid@') {
        container.querySelector('.mdc-list-item__meta').classList.remove('container--hidden');
    }
}

// Set RTC User Transfer List Container Data
function setRTCUserTransferContainer(container, user) {
    let userInfo = user.userInfo;
    let userPhoto = (userInfo.photoURL)? decodeURIComponent(userInfo.photoURL) : '/static/images/manifest/user_f.svg';

    container.id = 'tl_' + user.id;
    container.setAttribute('data-meta-uid', user.id);
    container.querySelector('.mdc-list-item__graphic').src = userPhoto;
    container.querySelector('.mdc-radio__native-control').value = user.id
    container.querySelector('.mdc-list-item__primary-text').textContent = userInfo.name;
    container.querySelector('.mdc-list-item__secondary-text').textContent = userInfo.roles;
}

// Set User Status Element Color
function setUserStatusColor(elm, usrStatus) {
    elm.classList.remove('s-font-color-chat-away', 's-font-color-chat-busy', 's-font-color-chat-offline');
    elm.classList.remove('s-font-color-chat-online', 's-font-color-chat-transferred');
    switch (usrStatus) {
        case 'Atendido':
        case 'Atendiendo':
            elm.classList.add('s-font-color-chat-busy');
            break;
        case 'Ausente':
        case 'En reunión':
            elm.classList.add('s-font-color-chat-away');
            break;
        case 'Disponible':
            elm.classList.add('s-font-color-chat-online');
            break;
        case 'Offline':
            elm.classList.add('s-font-color-chat-offline');
            break;
        case 'Transferid@':
            elm.classList.add('s-font-color-chat-transferred');
            break;
    }
}

// Show Contacts List - Back Button
function showContactsList() {
    let chatBodyEl = document.querySelector('.container-chat--body');
    let chatFooterEl = document.querySelector('.container-chat--footer');
    let chatNoConver = document.querySelector('.container-chat--no-conversation');
    let chatTopBarEl = document.querySelector('.container-chat--topbar');
    let sideMenuEl = document.querySelector('.container-chat--sidemenu');
    let elemFocus = null;

    document.querySelectorAll('.container-chat--sidemenu-rooms-usertype').forEach((cont) => {
        if (cont.querySelector('.mdc-list-item--selected')) {
            elemFocus = cont.querySelector('.mdc-list-item--selected');
        };
    });

    chatBodyEl.classList.add('container--hidden');
    chatFooterEl.classList.add('container--hidden');
    chatNoConver.classList.add('container--hidden');
    chatTopBarEl.classList.add('container--hidden');
    sideMenuEl.classList.remove('container--hidden');

    if (elemFocus) {
        elemFocus.classList.remove('mdc-list-item--selected');
    }
}

// Show Conversation Messages Retrieved
function showConversationMessages(users, messages, uid) {
    messages.forEach((msg) => {
        if (msg.user_id == swcms.advStreams.myUserInfo.id) {
            let usr_name = swcms.advStreams.myUserInfo.name;
            let usr_photoURL = swcms.advStreams.myUserInfo.photoURL;
            swcms.appendChatMessage(msg.message, msg.msg_date, 'me', usr_name, uid, usr_photoURL, true);
        } else {
            let usr_name;
            let usr_photoURL;
            users.forEach((user) => {
                if (msg.user_id == user.id) {
                    usr_name = user.name;
                    usr_photoURL = user.photoURL;
                }
            });
            swcms.appendChatMessage(msg.message, msg.msg_date, 'others', usr_name, uid, usr_photoURL, true);
        }
    });
}

// Show Conversation UI
function showConversationUI(showOrHide, usrElem) {
    let chatBodyEl = document.querySelector('.container-chat--body');
    let chatFooterEl = document.querySelector('.container-chat--footer');
    let chatNoConver = document.querySelector('.container-chat--no-conversation');
    let chatTopBarEl = document.querySelector('.container-chat--topbar');
    let sideMenuEl = document.querySelector('.container-chat--sidemenu');
    let elemFocus = false;
    if (usrElem) {
        elemFocus = usrElem.classList.contains('mdc-list-item--selected');
    }
    
    // True: shows UI IF the element is not already displayed
    if (showOrHide && !elemFocus) {
        let uType = usrElem.getAttribute('data-meta-utype');
        let uid = (uType == 'anon')? usrElem.getAttribute('data-meta-rid') : usrElem.getAttribute('data-meta-uid');
        let chatMessagesEl = document.getElementById('m_' + uid);
        let currentElemFocus = null;
        
        document.querySelectorAll('.container-chat--sidemenu-rooms-usertype').forEach((cont) => {
            if (cont.querySelector('.mdc-list-item--selected')) {
                currentElemFocus = cont.querySelector('.mdc-list-item--selected');
            };
        });

        chatBodyEl.classList.remove('container--hidden');
        chatFooterEl.classList.remove('container--hidden');
        chatTopBarEl.classList.remove('container--hidden');
        chatNoConver.classList.add('container--hidden');

        if (currentElemFocus) {
            currentElemFocus.classList.remove('mdc-list-item--selected');
        }
        usrElem.classList.add('mdc-list-item--selected', 'container-chat--sidemenu-assigned');
        usrElem.querySelector('.mdc-list-item__meta').classList.add('container--hidden');
        
        // Mobile UI - Hide SideMenu
        if (window.matchMedia("(max-width: 37.49em)").matches) {
            sideMenuEl.classList.add('container--hidden');
        }
        
        // Show User's Messages Section
        let activeMsgEl = document.querySelector('.container-chat--body-messages-active');
        if (activeMsgEl) {
            activeMsgEl.classList.remove('container-chat--body-messages-active');
            activeMsgEl.classList.add('container-chat--body-messages-hidden');
        }
        chatMessagesEl.classList.remove('container-chat--body-messages-hidden');
        chatMessagesEl.classList.add('container-chat--body-messages-active');
        // Scroll the conversation all the way to the bottom
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        
        // Update User's Topbar info
        let usrName = usrElem.querySelector('.mdc-list-item__primary-text').textContent;
        let usrPhoto = usrElem.querySelector('.mdc-list-item__graphic').src;
        let usrStatus = usrElem.getAttribute('data-meta-status');
        let transferOption = document.querySelector('#transferUserOption');
        document.querySelector('#chat-pic').src = usrPhoto;
        document.querySelector('.container-chat--topbar-info-data-name').textContent = usrName;
        updateRTCUserStatus(uid, usrStatus);
        if (uType == 'emp' && transferOption) {
            transferOption.classList.add('mdc-list-item--disabled');
        } else {
            transferOption.classList.remove('mdc-list-item--disabled');
        }
        // Update is Typing Message
        let activeIsTypingEl = document.querySelector('.container-chat--body-message-istyping');
        activeIsTypingEl.classList.add('container--hidden');
        activeIsTypingEl.textContent = usrName + ' está escribiendo...';

        // Update User's Call UI
        document.querySelector('#callerid-pic').src = usrPhoto;
        document.querySelector('#callerid-name').textContent = usrName;
    
    // False: shows No Conversation UI
    } else if (!showOrHide) {
        chatBodyEl.classList.add('container--hidden');
        chatFooterEl.classList.add('container--hidden');
        chatTopBarEl.classList.add('container--hidden');

        let activeMsgEl = document.querySelector('.container-chat--body-messages-active');
        if (activeMsgEl) {
            activeMsgEl.classList.remove('container-chat--body-messages-active');
            activeMsgEl.classList.add('container-chat--body-messages-hidden');
        }

        if (elemFocus) {
            usrElem.classList.remove('container-chat--sidemenu-assigned');
            usrElem.classList.remove('mdc-list-item--selected');
        }
        
        // Mobile UI - Show SideMenu
        if (window.matchMedia("(max-width: 37.49em)").matches) {
            chatNoConver.classList.add('container--hidden');
            sideMenuEl.classList.remove('container--hidden');
        } else {
            chatNoConver.classList.remove('container--hidden');
            sideMenuEl.classList.remove('container--hidden');
        }
    }
}

// Show RTC User List
function showRTCUserList(userlist) {
    let rtcULID = [];
    let rtcUTID = [];
    // Iterate through Anonymous users
    userlist.rtc_online_users.anon_users.forEach((user) => {
        appendRTCUser(user.r_id, user, 'anon');
        rtcULID.push('l_' + user.r_id);
    });
    // Iterate through Employees users
    userlist.rtc_online_users.emp_users.forEach((user) => {
        if (user.id != swcms.advStreams.myUserInfo.id) {
            appendRTCUser(user.r_id, user, 'emp');
            appendRTCTransferList(user);
            rtcULID.push('l_' + user.id);
            rtcUTID.push('tl_' + user.id);
        } else {
            // Update User Account Info
            let accImgEl = document.querySelector('#header-accountImage');
            let accNameEl = document.querySelector('.container-chat--sidemenu-header-info-data-name');
            let accStatEl = document.querySelector('.container-chat--sidemenu-header-info-data-status-icon');
            let accStatTxtEl = document.querySelector('.container-chat--sidemenu-header-info-data-status-text');

            accImgEl.src = swcms.advStreams.myUserInfo.photoURL;
            accNameEl.textContent = swcms.advStreams.myUserInfo.name;
            accStatTxtEl.textContent = '[' + user.userInfo.roles + '] ' + user.userInfo.status;
            setUserStatusColor(accStatEl, user.userInfo.status);
        }
    });
    // Iterate through Registered users
    userlist.rtc_online_users.reg_users.forEach((user) => {
        appendRTCUser(user.r_id, user, 'reg');
        rtcULID.push('l_' + user.id);
    });
    // Remove users not Online unless focused
    document.querySelectorAll('#transfer-list > li').forEach((elm) => {
        if (!rtcUTID.includes(elm.id)) {
            elm.remove();
        }
    });
    document.querySelectorAll('.container-chat--sidemenu-rooms-usertype').forEach((cont) => {
        let qry = 'li:not(.container-chat--sidemenu-rooms-usertype-header):not(.container-chat--sidemenu-rooms-usertype-empty)';
        cont.querySelectorAll(qry).forEach((elm) => {
            if (!rtcULID.includes(elm.id)) {
                // Get User Type and ID
                let uType = elm.getAttribute('data-meta-utype');
                let id = (uType == 'anon')? elm.getAttribute('data-meta-rid') : elm.getAttribute('data-meta-uid');
    
                if (!elm.classList.contains('mdc-list-item--selected')){
                    // Remove element if not in focus
                    let m_elm = document.getElementById('m_' + id);
                    elm.remove();
                    m_elm.remove();
                } else {
                    // Update element to offline if in focus
                    updateRTCUserStatus(id, 'Offline');
                }
            }
        });
    });
    // Show No Active Room if there are no users
    let noActiveRooms = true;
    document.querySelectorAll('.container-chat--sidemenu-rooms-usertype').forEach((cont) => {
        let qry = 'li:not(.container-chat--sidemenu-rooms-usertype-header):not(.container-chat--sidemenu-rooms-usertype-empty)';
        if (cont.querySelectorAll(qry).length > 0) {
            cont.querySelector('.container-chat--sidemenu-rooms-usertype-empty').classList.add('container--hidden');
            if (cont.querySelectorAll('.mdc-list-item--selected').length > 0)
                noActiveRooms = false;
        } else {
            cont.querySelector('.container-chat--sidemenu-rooms-usertype-empty').classList.remove('container--hidden');
        }
    });
    filterRTCUserList(lastRTCFilterVal);
    if (noActiveRooms) {
        showConversationUI(false, '');
    }

    if (document.querySelectorAll('#transfer-list > li').length > 0) {
        document.querySelector('#transfer-list').classList.remove('container--hidden');
        document.querySelector('#no-transfer-list').classList.add('container--hidden');
    } else {
        document.querySelector('#transfer-list').classList.add('container--hidden');
        document.querySelector('#no-transfer-list').classList.remove('container--hidden');
    }
}

// Save Conversation Message into DB
function storeConvMsg(uid, msg, date, convPeer, convId = currPeerObj.cid, uType = 'emp') {
    if (convPeer && !convPeer.destroyed && convPeer.initiator) {
        console.log('Storing Conversation');
        let jsn = JSON.stringify({
            'msg': msg,
            'u_id': uid,
            'date': date,
            'u_type': uType
        });
        socket.emit('saveConversation', {
            'cid': convId,
            'data': jsn
        });
    }
}
/* Allow 'window' context to reference the function */
window.storeConvMsg = storeConvMsg;

// Transfer RTC User
function transferRTCUser() {
    console.log('Transfering user...');
    let empUserRadio = document.querySelector('input[name="d-transfer-radios"]:checked');
    
    if (empUserRadio) {
        let userTransfer = null;
        document.querySelectorAll('.container-chat--sidemenu-rooms-usertype').forEach((cont) => {
            if (cont.querySelector('.mdc-list-item--selected')) {
                userTransfer = cont.querySelector('.mdc-list-item--selected');
            };
        });
        let r_id = userTransfer.getAttribute('data-meta-rid');
        let u_type = userTransfer.getAttribute('data-meta-utype');
        let uid = (u_type == 'anon')? r_id : userTransfer.getAttribute('data-meta-uid');
        let msgEl = document.getElementById('m_' + uid);
        let loadEl = msgEl.querySelector('.s-loader');
        let msgloadEl = msgEl.querySelector('.container-chat--body-messages-load');

        if (!peer.destroyed && peer.connected) {
            document.getElementById('chat-textarea-input').value = '- Transferencia en curso. Por favor, espere un momento.';
            document.getElementById('chat-textarea-button').click();

            socket.emit('updateUsersStatus', JSON.stringify({
                'e_id': swcms.advStreams.myUserInfo.id,
                's_type': 'transferred',
                'u_id': r_id,
                'u_type': u_type,
                'e_t_id': empUserRadio.value
            }));

            peer.destroy();
        }

        document.querySelector('#d-transfer-ufilter-input').value = '';
        showConversationUI(false, userTransfer);
        empUserRadio.checked = false;
        enableRTCUserList();
        msgEl.textContent = '';
        msgEl.appendChild(msgloadEl);
        msgEl.appendChild(loadEl);
        swcms.showUserRTCConSnackbar('trn', userTransfer.querySelector('.mdc-list-item__primary-text').textContent);
    }
}

// Update RTC User Action Buttons elements
function updateRTCUserActionButtons(usrStatus, usrType) {
    switch (usrStatus) {
        case 'Atendido':
        case 'Atendiendo':
            document.querySelector('#audioCall').disabled = false;
            document.querySelector('#videoCall').disabled = false;
            break;
        case 'Ausente':
        case 'Disponible':
        case 'En reunión':
            if (usrType == 'emp') {
                document.querySelector('#audioCall').disabled = false;
                document.querySelector('#videoCall').disabled = false;
            } else {
                document.querySelector('#audioCall').disabled = true;
                document.querySelector('#videoCall').disabled = true;
            }
            break;
        case 'Offline':
        case 'Transferid@':
            document.querySelector('#audioCall').disabled = true;
            document.querySelector('#videoCall').disabled = true;
            break;
    }
}

// Update RTC User Personal Status
function updateRTCUserPersonalStatus(e) {
    if (e.detail.index == 0) {
        // Available
        socket.emit('updateUsersStatus', JSON.stringify({
            'e_id': swcms.advStreams.myUserInfo.id,
            's_type': 'online',
            'u_id': null,
            'u_type': null
        }));
    } else if (e.detail.index == 1) {
        // Away
        socket.emit('updateUsersStatus', JSON.stringify({
            'e_id': swcms.advStreams.myUserInfo.id,
            's_type': 'away',
            'u_id': null,
            'u_type': null
        }));
    } else if (e.detail.index == 2) {
        // On a meeting
        socket.emit('updateUsersStatus', JSON.stringify({
            'e_id': swcms.advStreams.myUserInfo.id,
            's_type': 'meeting',
            'u_id': null,
            'u_type': null
        }));
    }
}
/* Allow 'window' context to reference the function */
window.updateRTCUserPersonalStatus = updateRTCUserPersonalStatus;

// Update RTC User Status elements
function updateRTCUserStatus(id, usrStatus) {
    let elem = document.getElementById('l_' + id);
    let elemFocus = elem.classList.contains('mdc-list-item--selected');
    let uActTime = (usrStatus != 'Offline')? elem.getAttribute('data-meta-utime') : returnFormatDate(Date.now());
    let uRoles = elem.getAttribute('data-meta-roles');
    let uType = elem.getAttribute('data-meta-utype');

    let statusText = (uType == 'emp')? '[' + uRoles + '] ' + usrStatus + ' - ' + uActTime : usrStatus + ' - ' + uActTime;
    elem.querySelector('.mdc-list-item__secondary-text').textContent = statusText;
    setUserStatusColor(elem.querySelector('.mdc-list-item__graphic-status'), usrStatus);
    

    if (elemFocus) {
        let ftTextAreaElem = document.querySelector('.mdc-text-field--textarea');
        let ftTextInputElem = document.querySelector('.mdc-text-field__input');
        let tbStatIconElem = document.querySelector('.container-chat--topbar-info-data-status-icon');
        let tbStatTextElem = document.querySelector('.container-chat--topbar-info-data-status-text');
        let wasOfflineNowOnline = tbStatTextElem.textContent.includes('Offline');

        switch (usrStatus) {
            case 'Ausente':
            case 'Disponible':
            case 'En reunión':
                if (uType == 'emp') {
                    tbStatTextElem.classList.remove('s-font-color-secondary');
                    tbStatTextElem.classList.add('s-font-color-primary');
                    ftTextAreaElem.classList.remove('mdc-text-field--disabled');
                    ftTextInputElem.disabled = false;
                } else {
                    ftTextAreaElem.classList.add('mdc-text-field--disabled');
                    ftTextInputElem.disabled = true;
                }
                break;
            case 'Offline':
                tbStatTextElem.classList.remove('s-font-color-primary');
                tbStatTextElem.classList.add('s-font-color-secondary');
                ftTextAreaElem.classList.add('mdc-text-field--disabled');
                ftTextInputElem.disabled = true;
                break;
            default:
                tbStatTextElem.classList.remove('s-font-color-secondary');
                tbStatTextElem.classList.add('s-font-color-primary');
                ftTextAreaElem.classList.remove('mdc-text-field--disabled');
                ftTextInputElem.disabled = false;
        }
        tbStatTextElem.textContent = statusText;
        setUserStatusColor(tbStatIconElem, usrStatus);
        updateRTCUserActionButtons(usrStatus, uType);

        // If user was Offline and now Online, automatically reconnect
        if (wasOfflineNowOnline && usrStatus == 'Disponible') {
            console.log('Reconnecting to user...');
            console.log(id);
            elem.click();
        }
    }
}

