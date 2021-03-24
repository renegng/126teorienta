/************************** EMPLOYEE APPOINTMENTS **************************/
import * as cscApiKey from '../../instance/js/swing_countrycitystate-api-key.json';
import { MDCMenu, Corner } from '@material/menu';


/************************** FUNCTIONS **************************/

export const appCountry = 'SV';
export var appCal, citiesData, maxDate, minDate, setUserCity, statesData = null;
export var jsonEmpDetails, jsonEmpBusySch, jsonServiceDetails, jsonUserDetails = null;

// MDC Assigned Components to Variables
// This is done to reference specific MDC instantiated elements, their properties and functions
export const mdcAssignedVars = {};

// Create Employee's Busy Schedule
function createBusyEmployeeSchedule() {
    if (jsonEmpDetails) {
        jsonEmpBusySch = {
            'busySchedule': [],
            'conflicts': {},
            'id':jsonEmpDetails.id
        };
        jsonEmpDetails.appointments.forEach((appt) => {
            let dt = new Date(appt.date_scheduled);
            let dtEnd = new Date(dt);
            let sessDura = parseInt(appt.service.duration);

            dtEnd.setMinutes(dtEnd.getMinutes() + sessDura);

            jsonEmpBusySch.busySchedule.push({
                'startTime': dt.getTime(),
                'finishTime': dtEnd.getTime()
            });
        });

        // Figure all employee's schedule conflicts
        if (jsonEmpBusySch.busySchedule) {
            let dateLoop = swcms.newDate(minDate);
            let busySched = Array.from(jsonEmpBusySch.busySchedule);
            
            // Analyze all dates between Min and Max Dates allowed
            while (dateLoop <= maxDate) {
                let isDateWeekEven = (dateLoop.getWeekOfYear() % 2 == 0)? 'even' : 'odd';

                jsonServiceDetails.sessions_schedule.forEach((week_schedule) => {
                    if (week_schedule.weeks == isDateWeekEven || week_schedule.weeks == 'all') {
                        if (week_schedule.wdays.includes(dateLoop.getDayString())) {
                            // Validate Busy Schedules against Available Sessions
                            week_schedule.hours.forEach((sess) => {
                                // Calculate Session Starting Time
                                let sesStartTime = swcms.newDate(dateLoop);
                                let sessDura = parseInt(sess.duration);
                                let sessTime = sess.start_time.split(':');
                                let sessMins = parseInt(sessTime[1]);
                                let sessHour = parseInt(sessTime[0]);
                                sesStartTime.setSeconds(0);
                                sesStartTime.setHours(sessHour);
                                sesStartTime.setMinutes(sessMins);

                                // Calculate Session Ending Time
                                let sesFinishTime = swcms.newDate(sesStartTime);
                                sesFinishTime.setMinutes(sesFinishTime.getMinutes() + sessDura);

                                let removeSchedules = [];
                                // Analyze Employee's Busy Schedule Against the Services Sessions
                                busySched.forEach((meeting, index) => {
                                    let empStartTime = swcms.newDate(parseInt(meeting.startTime));
                                    let empFinishTime = swcms.newDate(parseInt(meeting.finishTime));

                                    // Remove meeting for next iteration if it's older than current date analyzed
                                    if (empFinishTime.getTime() < sesStartTime.getTime()) {
                                        removeSchedules.push(index);
                                        return;
                                    }

                                    // Employee is found Busy at this date at this hour for this session
                                    if (sesFinishTime.getTime() >= empStartTime.getTime() && sesStartTime.getTime() <= empFinishTime.getTime()) {
                                        let formatDate = swcms.returnFormatDate(dateLoop, 'date');

                                        if (!(formatDate in jsonEmpBusySch.conflicts)) {
                                            jsonEmpBusySch.conflicts[formatDate] = {
                                                'con_count': 1,
                                                'max_count': week_schedule.hours.length,
                                                'sessions': [{
                                                    'startTime': sesStartTime.getTime(),
                                                    'finishTime': sesFinishTime.getTime()
                                                }]
                                            };
                                        } else {
                                            jsonEmpBusySch.conflicts[formatDate].con_count = jsonEmpBusySch.conflicts[formatDate].con_count + 1;
                                            jsonEmpBusySch.conflicts[formatDate].sessions.push({
                                                'startTime': sesStartTime.getTime(),
                                                'finishTime': sesFinishTime.getTime()
                                            });
                                        }
                                    }
                                });
                                // Remove Employee's Meetings older than Dates Analyzed
                                removeSchedules.forEach((elm) => { busySched.splice(elm, 1); });
                            });
                        }
                    }
                });

                // Analyze Next Day
                dateLoop.setDate(dateLoop.getDate() + 1);
            }
        }
    }
}

// Create Service Sessions Containers
function createServiceSessionsContainers() {
    if (jsonServiceDetails) {
        let appointElm = document.querySelector('.container-appointment-sessions');
        
        appointElm.innerHTML = '';
        jsonServiceDetails.sessions_schedule.forEach((week_schedule) => {
            let sessionContainer = document.createElement('div');
            sessionContainer.classList.add('container-appointment-hours');
            sessionContainer.setAttribute('data-app-week', week_schedule.weeks);
            sessionContainer.setAttribute('data-app-days', week_schedule.wdays.join('-'));

            let sessionHours = 0;
            week_schedule.hours.forEach((session) => {
                let hourContainer = document.createElement('div');
                let hourPrimary = document.createElement('div');
                let hourDaytime = document.createElement('div');
                let hourHourElm = document.createElement('div');
                let hourDateElm = document.createElement('div');
                let hourDTtext = document.createElement('span');
                let hourDTicon = document.createElement('i');

                hourContainer.classList.add('mdc-card');
                hourPrimary.classList.add('mdc-card__primary-action');
                hourDaytime.classList.add('container-appointment-hours--daytime');
                hourDTicon.classList.add('material-icons', 'mdc-text-field__icon');
                hourDTtext.classList.add('mdc-typography--caption');
                hourHourElm.classList.add('mdc-typography--headline6', 'container-appointment-hours--time', 's-font-color-secondary');
                hourDateElm.classList.add('mdc-typography--subtitle2', 'container-appointment-hours--date');

                hourContainer.setAttribute('onclick', 'selectAppointmentTime(this);');
                hourPrimary.setAttribute('tabindex', '0');

                let dtHour = new Date();
                let sessDura = parseInt(session.duration);
                let sessTime = session.start_time.split(':');
                let sessMins = parseInt(sessTime[1]);
                let sessHour = parseInt(sessTime[0]);
                dtHour.setSeconds(0);
                dtHour.setHours(sessHour);
                dtHour.setMinutes(sessMins);
                
                if (sessHour >= 0 && sessHour < 6) {
                    hourDTicon.classList.add('s-icon-color-twitter');
                    hourDTicon.innerHTML = 'dark_mode';
                    hourDTtext.innerHTML = 'Madrugada';
                } else if (sessHour >= 6 && sessHour < 12) {
                    hourDTicon.classList.add('s-font-color-chat-away');
                    hourDTicon.innerHTML = 'wb_sunny';
                    hourDTtext.innerHTML = 'Mañana';
                } else if (sessHour >= 12 && sessHour < 18) {
                    hourDTicon.classList.add('s-font-color-chat-transferred');
                    hourDTicon.innerHTML = 'wb_twilight';
                    hourDTtext.innerHTML = 'Tarde';
                } else if (sessHour >= 18 && sessHour <= 23) {
                    hourDTicon.classList.add('s-icon-color-linkedin');
                    hourDTicon.innerHTML = 'nights_stay';
                    hourDTtext.innerHTML = 'Noche';
                }

                let dtHourEnd = new Date(dtHour);
                dtHourEnd.setMinutes(dtHourEnd.getMinutes() + sessDura);
                hourHourElm.setAttribute('data-app-sess-s', dtHour.getTime());
                hourHourElm.setAttribute('data-app-sess-f', dtHourEnd.getTime());
                hourHourElm.innerHTML = swcms.returnFormatDate(dtHour, 'time') + ' - ' + swcms.returnFormatDate(dtHourEnd, 'time');
                hourDateElm.innerHTML = '-';

                hourDaytime.appendChild(hourDTicon);
                hourDaytime.appendChild(hourDTtext);
                hourPrimary.appendChild(hourDaytime);
                hourPrimary.appendChild(hourHourElm);
                hourPrimary.appendChild(hourDateElm);
                hourContainer.appendChild(hourPrimary);
                sessionContainer.appendChild(hourContainer);

                sessionHours++;
            });

            sessionContainer.setAttribute('data-app-sess', sessionHours);
            appointElm.appendChild(sessionContainer);
        });
    }
}

// Create User Result List Element Container
function createUserResultContainer(user = null) {
    let userContainer = document.createElement('li');
    let userEmail = document.createElement('span');
    let userName = document.createElement('span');
    let rippleEl = document.createElement('span');
    let userTxtC = document.createElement('span');
    let userIcon = document.createElement('i');

    userContainer.classList.add('mdc-list-item');
    rippleEl.classList.add('mdc-list-item__ripple');
    userIcon.classList.add('material-icons', 'mdc-list-item__graphic');
    userTxtC.classList.add('mdc-list-item__text');
    userName.classList.add('mdc-list-item__primary-text')
    userEmail.classList.add('mdc-list-item__secondary-text');

    userIcon.setAttribute('aria-hidden', 'true');
    userContainer.setAttribute('role', 'menuitem');
    userContainer.setAttribute('tabindex', '0');

    if (user) {
        userContainer.setAttribute('data-value', user.u_id);
        userName.textContent = user.u_name;
        userIcon.textContent = 'person';
        userEmail.textContent = user.u_email;
    } else {
        userContainer.setAttribute('data-value', -1);
        userName.textContent = '0 Resultados';
        userIcon.textContent = 'search_off';
        userEmail.textContent = 'No se encontraron registros';
    }

    userTxtC.appendChild(userName);
    userTxtC.appendChild(userEmail);
    userContainer.appendChild(rippleEl);
    userContainer.appendChild(userIcon);
    userContainer.appendChild(userTxtC);

    return userContainer;
}

// Get Cities
export function getCities(selState) {
    if (selState) {
        let apiUrl = `https://api.countrystatecity.in/v1/countries/${appCountry}/states/${selState}/cities`;
        let headers = new Headers();
        let requestOptions = {
            method: 'GET',
            headers: headers,
            redirect: 'follow'
        };
        headers.append("X-CSCAPI-KEY", cscApiKey.apiKey);
        swcms.getFetch(apiUrl, 'loadCities', requestOptions).then((data) => {
            // If User Detail is being loaded
            if (setUserCity) {
                mdcAssignedVars['u.city'].value = setUserCity.id;
                setUserCity = null;
            }
        });
    }
}
/* Allow 'window' context to reference the function */
window.getCities = getCities;

// Get States
export function getStates() {
    let apiUrl = `https://api.countrystatecity.in/v1/countries/${appCountry}/states`;
    let headers = new Headers();
    let requestOptions = {
        method: 'GET',
        headers: headers,
        redirect: 'follow'
    };
    headers.append("X-CSCAPI-KEY", cscApiKey.apiKey);
    swcms.getFetch(apiUrl, 'loadStates', requestOptions);
}
/* Allow 'window' context to reference the function */
window.getStates = getStates;

// Get Users Results
export function getUsers(uType, timer) {
    let txtEl = (uType == 'usr')? document.getElementById('f-appointment-ufilter-input') : document.getElementById('f-appointment-efilter-input');
    let txtIn = txtEl.value.trim();
    
    if (txtIn.length > 1) {
        let query = encodeURIComponent(txtIn);
        let ft = (uType == 'usr')? '' : 'sur';
        let apiUrl = `/api/list/users/?ft=${ft}&flt=${uType}&qry=${query}`;

        swcms.getFetch(apiUrl, 'loadUsersResults');
    } else {
        if (uType == 'usr') {
            searchResultsUsers.open = false;
        } else {
            searchResultsEmployees.open = false;
        }
    }
    window.clearTimeout(timer);
    timer = null;
}
/* Allow 'window' context to reference the function */
window.getUsers = getUsers;

// Load Cities
export function loadCities(data) {
    let citListEl = document.querySelector('#f-appointment-city-select');
    let sortedData = data.sort((a, b) => a.name < b.name ? -1 : 1);

    mdcAssignedVars['u.city'].selectedIndex = -1;
    citListEl.innerHTML = '';

    sortedData.forEach((cit, index) => {
        let citContainer = document.createElement('li');
        let citName = document.createElement('span');

        citContainer.classList.add('mdc-list-item');
        citName.classList.add('mdc-list-item__text');

        citName.textContent = cit.name;
        citContainer.setAttribute('data-value', cit.id);

        citContainer.appendChild(citName);
        citListEl.appendChild(citContainer);

        mdcAssignedVars['u.city'].foundation_.menuItemValues[index] = cit.id;
    });
    citiesData = data;
}
/* Allow 'window' context to reference the function */
window.loadCities = loadCities;

// Load States
export function loadStates(data) {
    let depListEl = document.querySelector('#f-appointment-department-select');
    let sortedData = data.sort((a, b) => a.name < b.name ? -1 : 1);

    sortedData.forEach((dep, index) => {
        let depContainer = document.createElement('li');
        let depName = document.createElement('span');

        depContainer.classList.add('mdc-list-item');
        depName.classList.add('mdc-list-item__text');

        depName.textContent = dep.name.replace(' Department', '');
        depContainer.setAttribute('data-value', dep.iso2);

        depContainer.appendChild(depName);
        depListEl.appendChild(depContainer);

        mdcAssignedVars['u.state'].foundation_.menuItemValues[index] = dep.iso2;
    });
    statesData = data;
}
/* Allow 'window' context to reference the function */
window.loadStates = loadStates;

// Load User Details
export function loadUserDetails(data) {
    Object.entries(data).forEach(([key, val]) => {
        switch (key) {
            case 'country':
            case 'enabled':
            case 'email':
            case 'id':
            case 'roles':
            case 'status':
                break;

            case 'national_id_type':
                if (val){
                    mdcAssignedVars['u.national_id_type'].value = val;
                } else {
                    mdcAssignedVars['u.national_id_type'].selectedIndex = -1;
                }
                break;
            
            case 'city':
                mdcAssignedVars['u.city'].selectedIndex = -1;
                break;
            
            case 'state':
                mdcAssignedVars['u.state'].selectedIndex = -1;
                break;
            
            default:
                if (mdcAssignedVars['u.' + key]) mdcAssignedVars['u.' + key].value = (val)? val : '';
                break;
        }
    });
    if (data.state) {
        let statesElms = document.querySelectorAll('#f-appointment-department-select > li');
        // Validate that State exists in the Dropdown
        if (!statesElms){
            getStates().then((response) => {
                setUserCity = data.city;
                mdcAssignedVars['u.state'].value = data.state.iso2;
            });
        } else {
            setUserCity = data.city;
            mdcAssignedVars['u.state'].value = data.state.iso2;
        }
    }
    jsonUserDetails = data;
}
/* Allow 'window' context to reference the function */
window.loadUserDetails = loadUserDetails;

// Load User Information
export function loadUserInfo(evt, uType) {
    let usrId = evt.detail.item.getAttribute('data-value');
    
    // Verify if it's a valid User Record
    if (usrId != -1) {
        let usrName = evt.detail.item.querySelector('.mdc-list-item__primary-text').textContent;
        let usrEmail = evt.detail.item.querySelector('.mdc-list-item__secondary-text').textContent;
    
        if (uType == 'usr') {
            let apiUrl = `/api/detail/user/${usrId}/`;
            let usrCont = document.querySelector('.container-appointmentadm-user--record-info');
    
            usrCont.querySelector('.mdc-typography--caption').textContent = usrName;
            usrCont.querySelector('.mdc-typography--subtitle2').textContent = usrEmail;
            usrCont.classList.remove('container--hidden');
    
            document.querySelector('.container-appointment-confirm--user').textContent = usrName;
            document.getElementById('f-appointment-ufilter-input').value = usrName;
            document.getElementById('app_usr_id').value = usrId;

            swcms.getFetch(apiUrl, 'loadUserDetails');
        } else {
            let apiUrl = `/api/list/appointments/assigned/${usrId}/`;
            let empCont = document.querySelector('.container-appointmentadm-emp--record-info');
    
            empCont.querySelector('.mdc-typography--caption').textContent = usrName;
            empCont.querySelector('.mdc-typography--subtitle2').textContent = usrEmail;
            empCont.classList.remove('container--hidden');
    
            document.querySelector('.container-appointment-confirm--emp').textContent = usrName;
            document.getElementById('f-appointment-efilter-input').value = usrName;
            document.getElementById('app_emp_id').value = usrId;

            swcms.getFetch(apiUrl).then((data) => {
                jsonEmpDetails = data;
                createBusyEmployeeSchedule();
                appCal.refresh();
            });
        }
    }
}
/* Allow 'window' context to reference the function */
window.loadUserInfo = loadUserInfo;

// Load Users Results
export function loadUsersResults(data) {
    let uType = data.r_filter;
    let userListMenu = (uType == 'usr')? document.querySelector('#searchUsersMenu > ul') : document.querySelector('#searchEmployeesMenu > ul');
    userListMenu.innerHTML = '';

    if (data.r_total > 0) {
        data.records.forEach((user) => {
            userListMenu.appendChild(createUserResultContainer(user));
        });

        (uType == 'usr')? searchResultsUsers.open = true : searchResultsEmployees.open = true;
    } else {
        userListMenu.appendChild(createUserResultContainer());

        (uType == 'usr')? searchResultsUsers.open = true : searchResultsEmployees.open = true;
    }
}
/* Allow 'window' context to reference the function */
window.loadUsersResults = loadUsersResults;

// Save Appointment
export function saveAppointment() {
    let postData = {
        'uid': null,
        'sid': null,
        'eid': null,
        'sch': null,
        'udata': null
    };

    // Validate if all variables are in place
    if (document.getElementById('app_usr_id').value) {
        postData.uid = parseInt(document.getElementById('app_usr_id').value);
    } else {
        showSBMsg('Seleccione una usuaria', 'error', 'scroll', document.getElementById('step-one'));
        return false;
    }

    if (document.getElementById('app_svc_id').value) {
        postData.sid = document.getElementById('app_svc_id').value;
    } else {
        showSBMsg('Seleccione un servicio', 'error', 'scroll', document.getElementById('step-two'));
        return false;
    }

    if (document.getElementById('app_emp_id').value) {
        postData.eid = parseInt(document.getElementById('app_emp_id').value);
    } else {
        showSBMsg('Seleccione una funcionaria', 'error', 'scroll', document.getElementById('step-three'));
        return false;
    }

    if (document.getElementById('app_sch_dt').value) {
        postData.sch = parseInt(document.getElementById('app_sch_dt').value);
    } else {
        showSBMsg('Seleccione un horario', 'error', 'scroll', document.getElementById('step-five'));
        return false;
    }

    let apiUrl = '/api/detail/appointment/';
    let userData = Object.assign({}, jsonUserDetails);

    // Get User Data
    userData.names = mdcAssignedVars['u.names'].value.trim() || null;
    userData.last_names = mdcAssignedVars['u.last_names'].value.trim() || null;
    userData.national_id_type = mdcAssignedVars['u.national_id_type'].value || null;
    userData.national_id = mdcAssignedVars['u.national_id'].value.trim() || null;
    userData.phonenumber = mdcAssignedVars['u.phonenumber'].value.trim() || null;
    if (Date.parse(mdcAssignedVars['u.birthdate'].value)) {
        userData.birthdate = mdcAssignedVars['u.birthdate'].value;
    }
    if (mdcAssignedVars['u.state'].value) {
        userData.country = appCountry;
        statesData.forEach((state) => {
            if (state.iso2 == mdcAssignedVars['u.state'].value) {
                userData.state = state;
            }
        });
    }
    if (mdcAssignedVars['u.city'].value) {
        citiesData.forEach((city) => {
            if (city.id == mdcAssignedVars['u.city'].value) {
                userData.city = city;
            }
        });
    }

    // If User Data has been updated, include User Data
    if (JSON.stringify(userData) != JSON.stringify(jsonUserDetails)) {
        postData.udata = userData;
    }

    console.log(postData);
    document.getElementById('submitSaveButton').disabled = true;
    swcms.postFetch(apiUrl, postData).then((data) => {
        if (data.status == 200) {
            showSBMsg(data.msg, 'success', 'redirect', '/appointments/');
            window.setTimeout(() => { window.location.assign('/appointments/'); }, 3000);
        } else {
            showSBMsg(data.msg, 'error');
            document.getElementById('submitSaveButton').disabled = false;
        }
    }).catch((error) => {
        showSBMsg(error, 'error');
        document.getElementById('submitSaveButton').disabled = false;
    });
}
/* Allow 'window' context to reference the function */
window.saveAppointment = saveAppointment;

// Select Appointment Service
export function selectAppointmentService(value) {
    let apiUrl = `/api/detail/service/${value}/`;
    let svcIdEl = document.getElementById('app_svc_id');
    let svcConfirmEl = document.querySelector('.container-appointment-confirm--service');
    let svcName = document.querySelector('#f-appointment-service-select > li[data-value="' + value + '"]');

    svcConfirmEl.textContent = svcName.textContent;
    svcIdEl.value = value;
    
    swcms.getFetch(apiUrl).then((data) => {
        jsonServiceDetails = data;
        createServiceSessionsContainers();
    });

    mdcAssignedVars['e.name'].value = '';
    document.querySelector('.container-appointmentadm-emp--record-info').classList.add('container--hidden');
    document.querySelectorAll('.container-appointmentadm-emp--record-info > span').forEach((el) => {
        el.innerHTML = '-';
    });
    document.querySelector('.container-appointment-sessions').classList.add('container--hidden');
    document.querySelector('.container-appointment-empty').classList.remove('container--hidden');
    document.querySelector('.container-appointment-confirm--emp').innerHTML = '-';
    document.querySelector('.container-appointment-confirm--date').innerHTML = '-';
    document.querySelector('.container-appointment-confirm--time').innerHTML = '-';
    document.getElementById('app_emp_id').value = '';
    document.getElementById('app_sch_dt').value = '';
    jsonEmpDetails = null;
    jsonEmpBusySch = null;
    appCal.refresh();
}
/* Allow 'window' context to reference the function */
window.selectAppointmentService = selectAppointmentService;

// Select Appointmemt Time
export function selectAppointmentTime(elm) {
    let curSelected = document.querySelector('.mdc-card--selected');
    let dateConfirmEl = document.querySelector('.container-appointment-confirm--date');
    let timeConfirmEl = document.querySelector('.container-appointment-confirm--time');
    let timeSelectedEl = elm.querySelector('.container-appointment-hours--time').textContent;

    if (curSelected) {
        curSelected.classList.remove('mdc-card--selected');
        curSelected.querySelector('.container-appointment-hours--time').classList.remove('s-font-color-primary');
        curSelected.querySelector('.container-appointment-hours--time').classList.add('s-font-color-secondary');
    }
    
    elm.classList.add('mdc-card--selected');
    elm.querySelector('.container-appointment-hours--time').classList.remove('s-font-color-secondary');
    elm.querySelector('.container-appointment-hours--time').classList.add('s-font-color-primary');

    let dtDateConfEl = dateConfirmEl.textContent.split('/');
    let dtSessStart = swcms.newDate(parseInt(elm.querySelector('.container-appointment-hours--time').getAttribute('data-app-sess-s')));
    dtSessStart.setFullYear(parseInt(dtDateConfEl[2]));
    dtSessStart.setMonth(parseInt(dtDateConfEl[1])-1);
    dtSessStart.setDate(parseInt(dtDateConfEl[0]));
    dtSessStart.setSeconds(0);
    document.getElementById('app_sch_dt').value = dtSessStart.getTime();
    timeConfirmEl.textContent = timeSelectedEl;
}
/* Allow 'window' context to reference the function */
window.selectAppointmentTime = selectAppointmentTime;

// Show Snackbar Error Message
const appointmentSB = {
    'actionHandler': () => { console.log('Appointment Snackbar Message...'); },
    'actionText': 'OK',
    'message': 'Default message...',
    'showError': false,
    'showSuccess': false,
    'timeout': 7000
};
function showSBMsg(msg, state = null, actionHandler = null, actionHandlerArg = null) {
    // Show Error, Success or No Prefix
    if (state && state == 'error') {
        appointmentSB.showError = true;
        appointmentSB.showSuccess = false;
    } else if (state && state == 'success') {
        appointmentSB.showError = false;
        appointmentSB.showSuccess = true;
    } else {
        appointmentSB.showError = false;
        appointmentSB.showSuccess = false;
    }
    // Assign appropriate Action Handler Type
    if (actionHandler && actionHandler == 'redirect' && actionHandlerArg) {
        // Redirect to URL
        appointmentSB.actionHandler = () => {
            window.location.assign(actionHandlerArg);
        };
    } else if (actionHandler && actionHandler == 'scroll' && actionHandlerArg) {
        // Scroll View to Error Section Element
        appointmentSB.actionHandler = () => {
            actionHandlerArg.scrollIntoView();
        };
    } else {
        appointmentSB.actionHandler = () => {
            console.log('Appointment Snackbar Message...');
        };
    }
    // Message for the Snackbar
    appointmentSB.message = msg;
    swcms.initSnackbar(null, appointmentSB);
}

// Show Schedule Sessions depending on the Selected Date and Service and Employee's Availability
export function showSelectedSessions(date) {
    let dt = swcms.newDate(date);
    let formatDate = swcms.returnFormatDate(dt, 'date');
    let curSelected = document.querySelector('.mdc-card--selected');

    if (curSelected) {
        let timeConfirmHidEl = document.getElementById('app_sch_dt');
        let timeConfirmEl = document.querySelector('.container-appointment-confirm--time');

        curSelected.classList.remove('mdc-card--selected');
        curSelected.querySelector('.container-appointment-hours--time').classList.remove('s-font-color-primary');
        curSelected.querySelector('.container-appointment-hours--time').classList.add('s-font-color-secondary');

        timeConfirmHidEl.value = '';
        timeConfirmEl.textContent = '-';
    }

    if (jsonServiceDetails && jsonEmpDetails) {
        let sessionsExists = false;

        // Validate All Service Sessions against Selected Day
        document.querySelectorAll('.container-appointment-hours').forEach((hoursContainer) => {
            let isDateWeekEven = (dt.getWeekOfYear() % 2 == 0)? 'even' : 'odd';
            let hcWeeks = hoursContainer.getAttribute('data-app-week');
            let hcDays = hoursContainer.getAttribute('data-app-days');

            if (hcWeeks == isDateWeekEven || hcWeeks == 'all') {
                if (hcDays.includes(dt.getDayString())) {
                    hoursContainer.classList.remove('container--hidden');
                    hoursContainer.classList.add('container-appointment-hours--active');
                    
                    // Validate Busy Schedules against Available Sessions
                    hoursContainer.querySelectorAll('.mdc-card').forEach((el) => {
                        let isBusy, isPastTime = false;
                        let curTime = swcms.newDate();
                        let sesDateElm = el.querySelector('.container-appointment-hours--date');
                        let sesTimeElm = el.querySelector('.container-appointment-hours--time');
                        let elmStartTime = swcms.newDate(parseInt(sesTimeElm.getAttribute('data-app-sess-s')));
                        let elmFinishTime = swcms.newDate(parseInt(sesTimeElm.getAttribute('data-app-sess-f')));
                        let sesStartTime = swcms.newDate(new Date(
                            dt.getFullYear(),
                            dt.getMonth(),
                            dt.getDate(),
                            elmStartTime.getHours(),
                            elmStartTime.getMinutes(),
                            elmStartTime.getSeconds()
                        ));
                        let sesFinishTime = swcms.newDate(
                            sesStartTime.getTime() + (elmFinishTime.getTime() - elmStartTime.getTime())
                        );

                        if (jsonEmpBusySch) {
                            if (formatDate in jsonEmpBusySch.conflicts) {
                                jsonEmpBusySch.conflicts[formatDate].sessions.forEach((meeting) => {
                                    let empStartTime = swcms.newDate(parseInt(meeting.startTime));
                                    let empFinishTime = swcms.newDate(parseInt(meeting.finishTime));

                                    if (sesFinishTime.getTime() >= empStartTime.getTime() && sesStartTime.getTime() <= empFinishTime.getTime()) {
                                        isBusy = true;
                                    }
                                });
                            }
                        }

                        // Validate if Current Session has already expired (1 Hour Before)
                        curTime.setHours(curTime.getHours());
                        if (sesStartTime.getTime() < curTime.getTime()) {
                            isPastTime = true;
                        }

                        if (isBusy || isPastTime) {
                            el.classList.add('container--hidden');
                            sesDateElm.textContent = '-';
                        } else {
                            el.classList.remove('container--hidden');
                            sesDateElm.textContent = formatDate;
                            sessionsExists = true;
                        }
                    });
                } else {
                    hoursContainer.classList.remove('container-appointment-hours--active');
                    hoursContainer.classList.add('container--hidden');
                }
            } else {
                hoursContainer.classList.remove('container-appointment-hours--active');
                hoursContainer.classList.add('container--hidden');
            }
        });

        if (sessionsExists) {
            document.querySelector('.container-appointment-empty').classList.add('container--hidden');
            document.querySelector('.container-appointment-sessions').classList.remove('container--hidden');
        } else {
            document.querySelector('.container-appointment-empty').classList.remove('container--hidden');
            document.querySelector('.container-appointment-sessions').classList.add('container--hidden');
        }
    }
    document.querySelector('.container-appointment-confirm--date').textContent = formatDate;
}


/************************** MATERIAL DESIGN COMPONENTS INIT **************************/

// Material Menu
var isTypingUsrsTimeout = null;
var searchResultsUsers = new MDCMenu(document.querySelector('#searchUsersMenu'));
searchResultsUsers.setAnchorCorner(Corner.BOTTOM_START);
document.getElementById('f-appointment-ufilter-input').addEventListener('keyup', (evt) => {
    if (evt.key === 'Enter') {
        evt.preventDefault();
    }
    if (evt.key !== 'Shift' && evt.key !== 'Alt' && evt.key !== 'Control' && evt.key !== 'Meta') {
        if (isTypingUsrsTimeout !== null) {
            window.clearTimeout(isTypingUsrsTimeout);
            isTypingUsrsTimeout = window.setTimeout(() => {getUsers('usr', isTypingUsrsTimeout)}, 333);
        } else if (isTypingUsrsTimeout === null) {
            isTypingUsrsTimeout = window.setTimeout(() => {getUsers('usr', isTypingUsrsTimeout)}, 333);
        }
    }
});
document.querySelector('#searchUsersMenu').addEventListener('MDCMenu:selected', (evt) => { loadUserInfo(evt, 'usr') });

var isTypingEmpsTimeout = null;
var searchResultsEmployees = new MDCMenu(document.querySelector('#searchEmployeesMenu'));
searchResultsEmployees.setAnchorCorner(Corner.BOTTOM_START);
document.getElementById('f-appointment-efilter-input').addEventListener('keyup', (evt) => {
    if (evt.key === 'Enter') {
        evt.preventDefault();
    }
    if (evt.key !== 'Shift' && evt.key !== 'Alt' && evt.key !== 'Control' && evt.key !== 'Meta') {
        let uType = document.getElementById('app_svc_id').value;
        if (uType) {
            if (isTypingEmpsTimeout !== null) {
                window.clearTimeout(isTypingEmpsTimeout);
                isTypingEmpsTimeout = window.setTimeout(() => {getUsers(uType, isTypingEmpsTimeout)}, 333);
            } else if (isTypingEmpsTimeout === null) {
                isTypingEmpsTimeout = window.setTimeout(() => {getUsers(uType, isTypingEmpsTimeout)}, 333);
            }
        }
    }
});
document.querySelector('#searchEmployeesMenu').addEventListener('MDCMenu:selected', (evt) => { loadUserInfo(evt, 'emp') });


/************************** ON PAGE LOAD **************************/

// Get jsCalendar instance
window.addEventListener('load', () => {
    appCal = jsCalendar.get('#appointment-cal');
    
    // Calendar configuration
    // Minimum date to allow is Today
    minDate = swcms.newDate();
    minDate.setDate(minDate.getDate() - 1);
    minDate.setHours(0);
    minDate.setMinutes(0);
    minDate.setSeconds(0);
    appCal.min(minDate);

    // Maximum date to allow is Two Months from now
    maxDate = swcms.newDate();
    maxDate.setMonth(maxDate.getMonth() + 2);
    maxDate.setHours(0);
    maxDate.setMinutes(0);
    maxDate.setSeconds(0);
    appCal.max(maxDate);
    
    // Click on date behavior
    appCal.onDateClick((event, date) => {
        appCal.set(date);
    });

    // Make changes on the date elements
	appCal.onDateRender((date, element, info) => {
        // Color weekends days red
        if (!info.isCurrent && (date.getDay() == 0 || date.getDay() == 6)) {
            element.classList.add((info.isCurrentMonth) ? 'jsCalendar-date-weekend-currentmonth' : 'jsCalendar-date-weekend-othermonth');
        }
        // Color days before and after MinDate and MaxDate grey
        if (date < minDate || date > maxDate) {
            element.classList.add('jsCalendar-date-unavailable');
            element.classList.remove('jsCalendar-date-weekend-currentmonth', 'jsCalendar-date-weekend-othermonth');
        }
        // Color days between Monday and Friday when both Service Details and Employee Schedule is available
        if (jsonServiceDetails && jsonEmpDetails){
            if (date.getDay() > 0 && date.getDay() < 6 && date > minDate && date < maxDate && info.isCurrentMonth) {
                if (info.isCurrent) {
                    element.classList.remove('jsCalendar-date-available');
                } else {
                    let formatDate = swcms.returnFormatDate(date, 'date');

                    if (formatDate in jsonEmpBusySch.conflicts) {
                        let conflicts = parseInt(jsonEmpBusySch.conflicts[formatDate].con_count);
                        let daySessions = parseInt(jsonEmpBusySch.conflicts[formatDate].max_count);
                        let percAvailable = conflicts / daySessions;

                        if (percAvailable <= 0.5) {
                            element.classList.add('jsCalendar-date-available');
                        } else if (percAvailable > 0.5 && percAvailable < 1) {
                            element.classList.add('jsCalendar-date-booked');
                        } else if (percAvailable >= 1) {
                            element.classList.add('jsCalendar-date-booked-full');
                        }
                    } else {
                        element.classList.add('jsCalendar-date-available');
                    }
                }
            }
        }

        // Display the current date on the hours cards
        if (info.isCurrent) {
            showSelectedSessions(date);
        }
    });

	// Refresh Calendar layout
    appCal.refresh();

    // Load States
    getStates();

    // Store MDC Elements to Assigned Variables Object
    swcms.mdcSelects.forEach((sel) => {
        if (sel.assignedVar)
            mdcAssignedVars[sel.assignedVar] = sel;
    });

    swcms.mdcTextInputs.forEach((txt) => {
        if (txt.assignedVar)
            mdcAssignedVars[txt.assignedVar] = txt;
    });
});
