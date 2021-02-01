/************************** USER APPOINTMENTS **************************/
var appCal;

// Get jsCalendar instance
window.addEventListener('load', () => {
    appCal = jsCalendar.get('#appointment-cal');
    
    // Calendar configuration
    // Minimum date to allow is Today
    let minDate = new Date();
    minDate.setDate(minDate.getDate() - 1);
    appCal.min(minDate);

    // Maximum date to allow is Two Months from now
    let maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 2);
    appCal.max(maxDate);
    
    // Click on date behavior
    appCal.onDateClick((event, date) => {
        let dateConfirmEl = document.querySelector('.container-appointment-confirm--date');
        appCal.set(date);
        dateConfirmEl.textContent = swcms.returnFormatDate(date, 'date');
    });

    // Make changes on the date elements
	appCal.onDateRender((date, element, info) => {
		// Make weekends bold and red
		if (!info.isCurrent && (date.getDay() == 0 || date.getDay() == 6)) {
			element.style.fontWeight = 'bold';
			element.style.color = (info.isCurrentMonth) ? '#c32525' : '#ffb4b4';
		}
    });
    
	// Refresh Calendar layout
    appCal.refresh();
});

// Select Appointment Service
function selectAppointmentService(value) {
    let serviceConfirmEl = document.querySelector('.container-appointment-confirm--service');
    switch (value) {
        case 'assistance':
            serviceConfirmEl.textContent = 'Asistencia';
            break;
        case 'legal':
            serviceConfirmEl.textContent = 'Legal';
            break;
        case 'support':
            serviceConfirmEl.textContent = 'Orientación';
            break;
    }
}

// Select Appointmemt Time
function selectAppointmentTime(time) {
    let timeConfirmEl = document.querySelector('.container-appointment-confirm--time');
    timeConfirmEl.textContent = time;
}
