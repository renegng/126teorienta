import { advStreams, postFetch } from './swing_app';

// FirebaseUI config.
var firebaseUIConfig = {
    callbacks: {
        signInSuccessWithAuthResult: function(authResult, redirectUrl) {
            const user = authResult.user;
            user.getIdToken().then(idToken => {
                var postData = {
                    "idToken": idToken,
                    "csrfToken": "ADMIN123654"
                };
                postFetch('/loginuser/', postData);
            });
        },
        signInFailure: function(error) {
            // Some unrecoverable error occurred during sign-in.
            // Return a promise when error handling is completed and FirebaseUI
            // will reset, clearing any UI. This commonly occurs for error code
            // 'firebaseui/anonymous-upgrade-merge-conflict' when merge conflict
            // occurs. Check below for more details on this.
            return handleUIError(error);
        },
        uiShown: function() {
            // The widget is rendered.
            // Hide the loader.
            document.getElementById('s-loader').style.display = 'none';
        }
    },
    signInSuccessUrl: '/chat/home/',
    signInOptions: [
        // Leave the lines as is for the providers you want to offer your users.
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.FacebookAuthProvider.PROVIDER_ID,
        firebase.auth.EmailAuthProvider.PROVIDER_ID
    ],
    // Terms of service url/callback.
    tosUrl: '/terminosdelservicio/',
    // Privacy policy url/callback.
    privacyPolicyUrl: '/politicaprivacidad/'
}

// Initialize the FirebaseUI Widget using Firebase.
var firebaseUI = new firebaseui.auth.AuthUI(firebase.auth());

// The start method will wait until the DOM is loaded.
if (document.querySelector('#firebaseui-auth-container')) {
    firebaseUI.start('#firebaseui-auth-container', firebaseUIConfig);
}

// Avoids onAuthStateChanged initializeRTC on Signing Out
var userSignsOut = false;

// Get Signed-In User info
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        console.log('Firebase User Info found');
        advStreams.myUserInfo.name = user.displayName;
        advStreams.myUserInfo.photoURL = (user.photoURL) ? user.photoURL : '/static/images/manifest/user_f.svg';
        if (document.querySelector('#accountIcon')) {
            document.querySelector('#accountIcon').classList.add('container--hidden');
            document.querySelector('#accountImage').src = advStreams.myUserInfo.photoURL;
            document.querySelector('#accountImage').classList.remove('container--hidden');
            document.querySelector('#accountLogIn').classList.add('container--hidden');
            document.querySelector('#accountLogOut').classList.remove('container--hidden');
        }
    } else {
        // User is not signed in
        console.log('Firebase User Info not found');
        advStreams.myUserInfo.name = 'Anonim@';
        advStreams.myUserInfo.photoURL = '/static/images/manifest/user_f.svg';
    }

    // When a RTC Connection Intent exists, it executes signaling
    if (document.querySelector('.container-chat') && !userSignsOut) {
        initializeRTC();
    }
});

// Account LogIn/LogOut Redirect
export function accountRedirect(e) {
    if (e.detail.index == 0) {
        // Log In User
        window.location.href = '/login/';
    } else if (e.detail.index == 1) {
        // Log Out User
        firebase.auth().signOut().then(function() {
            // Firebase Sign-out successful. Proceed to close sessions
            // SocketIO disconnect session
            console.log('Signing out...');
            userSignsOut = true;
            if (window.socket) {
                console.log('Socket connection found. Ready to disconnect');
                socket.io.disconnect();
            }
            // Flask Session Sign Out
            window.location.href = '/logoutuser/';
        }).catch(function(error) {
            // An error happened.
            console.log(error);
        });
    }
}

// Track Auth State
// var fbInitApp = function () {
//     firebase.auth().onAuthStateChanged(function (user) {
//         if (user) {
//             // User is signed in.
//             var displayName = user.displayName;
//             var email = user.email;
//             var emailVerified = user.emailVerified;
//             var photoURL = user.photoURL;
//             var uid = user.uid;
//             var phoneNumber = user.phoneNumber;
//             var providerData = user.providerData;
//             user.getIdToken().then(function (accessToken) {
//                 document.getElementById('user-profile-picture-input').src = photoURL;
//                 document.getElementById('username-input').value = displayName;
//                 document.getElementById('user-email-input').value = email;
//                 document.getElementById('user-data-provider-input').value = providerData[0].providerId;
//                 //   document.getElementById('account-details').textContent = JSON.stringify({
//                 //     displayName: displayName,
//                 //     email: email,
//                 //     emailVerified: emailVerified,
//                 //     phoneNumber: phoneNumber,
//                 //     photoURL: photoURL,
//                 //     uid: uid,
//                 //     accessToken: accessToken,
//                 //     providerData: providerData
//                 //   }, null, '  ');
//             });
//         } else {
//             // User is signed out.
//             document.getElementById('user-profile-picture-input').src = "../static/images/manifest/icon-192x192.png";
//             document.getElementById('username-input').value = "-";
//             document.getElementById('user-email-input').value = "-";
//             document.getElementById('user-data-provider-input').value = "-";
//         }
//     }, function (error) {
//         console.log(error);
//     });
// };

// if (!isNull(document.querySelector('.s-user-info'))) {
//     window.addEventListener('load', function () {
//         fbInitApp()
//     });
// }