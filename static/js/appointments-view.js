/************************** APPOINTMENTS **************************/


/************************** FUNCTIONS **************************/

export var appCal, currAppListElm, jsonSchedule, minDate, maxDate = null;
export var currTab = 0;

// MDC Assigned Components to Variables
// This is done to reference specific MDC instantiated elements, their properties and functions
export const mdcAssignedVars = {};

function createCalendarSchedule() {
    jsonSchedule = {};

    document.querySelectorAll('.container-appointments-list').forEach((container) => {
        let contId = container.getAttribute('id');
        let tabId = 0;

        switch (contId) {
            case 'container-appointments-list--createdby':
                tabId = 1;
                break;
        }

        container.querySelectorAll('.mdc-card').forEach((appointment) => {
            let contDate = swcms.returnFormatDate(parseInt(appointment.getAttribute('data-app-sess-s')), 'date');

            if (!(tabId in jsonSchedule)) {
                jsonSchedule[tabId] = [];
                jsonSchedule[tabId].push(contDate);
            } else {
                if (!(jsonSchedule[tabId].includes(contDate))) {
                    jsonSchedule[tabId].push(contDate);
                }
            }
        });
    });
}

function showAppointments(date) {
    if (currAppListElm) {
        let hasApp = false;
        let nextDate = swcms.newDate(date);
        nextDate.setDate(nextDate.getDate() + 1);

        currAppListElm.querySelectorAll('.mdc-card').forEach((appointment) => {
            let appDate = swcms.newDate(parseInt(appointment.getAttribute('data-app-sess-s')));

            if (appDate.getTime() >= date.getTime() && appDate.getTime() < nextDate.getTime()) {
                appointment.classList.remove('container--hidden');
                hasApp = true;
            } else {
                appointment.classList.add('container--hidden');
            }
        });

        if (hasApp) {
            document.querySelector('.container-appointments-list--empty').classList.add('container--hidden');
            currAppListElm.classList.remove('container--hidden');
        } else {
            document.querySelector('.container-appointments-list--empty').classList.remove('container--hidden');
            currAppListElm.classList.add('container--hidden');
        }
    }
}

export function showAppointmentsTab(tabIndex) {
    currTab = tabIndex;
    if (currAppListElm) {
        currAppListElm.classList.add('container--hidden');
    }
    switch (tabIndex) {
        // My Appointments
        case 0:
            currAppListElm = document.getElementById('container-appointments-list--for');
            if (!currAppListElm) currAppListElm = document.getElementById('container-appointments-list--assigned');
            appCal.refresh();
            break;
        // Appointments Created By Me
        case 1:
            currAppListElm = document.getElementById('container-appointments-list--createdby');
            appCal.refresh();
            break;
    }
    return true;
}
/* Allow 'window' context to reference the function */
window.showAppointmentsTab = showAppointmentsTab;


/************************** MATERIAL DESIGN COMPONENTS INIT **************************/


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
        // Color days between Monday and Friday when Appointments are available
        if (jsonSchedule) {
            if (date.getDay() > 0 && date.getDay() < 6 && date > minDate && date < maxDate && info.isCurrentMonth) {
                if (info.isCurrent) {
                    element.classList.remove('jsCalendar-date-available');
                } else {
                    let formatDate = swcms.returnFormatDate(date, 'date');

                    if (currTab in jsonSchedule) {
                        if (jsonSchedule[currTab].includes(formatDate)) {
                            element.classList.add('jsCalendar-date-available');
                        }
                    }
                }
            }
        }

        // Show current date Appointments
        if (info.isCurrent) {
            showAppointments(date);
        }
    });

    // Create Calendar Analysis
    createCalendarSchedule();

	// Refresh Calendar layout - showAppointmentsTab has appCal.refresh()
    showAppointmentsTab(0);
});
