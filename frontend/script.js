class ScheduleGenerator {
    constructor() {
        this.routes = null;
        this.items = [];
        this.counter = 0;
        this.currentMonth = new Date();
        
        this.init();
        this.bindEvents();
        this.loadRoutes();
        this.setDefaultDate();
        this.initCalendar();
    }

    init() {
        this.startDate = document.getElementById('startDate');
        this.addBtn = document.getElementById('addStopBtn');
        this.itemsContainer = document.getElementById('scheduleItems');
        this.generateBtn = document.getElementById('generateBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.calendar = document.getElementById('calendar');
        this.monthDisplay = document.getElementById('currentMonth');
        this.prevBtn = document.getElementById('prevMonth');
        this.nextBtn = document.getElementById('nextMonth');
        this.modal = document.getElementById('stopsModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.stopsList = document.getElementById('stopsList');
        this.itemTemplate = document.getElementById('scheduleItemTemplate');
    }

    bindEvents() {
        this.addBtn.addEventListener('click', () => this.addItem());
        this.generateBtn.addEventListener('click', () => this.generateICS());
        this.clearBtn.addEventListener('click', () => this.clearAll());
        this.prevBtn.addEventListener('click', () => this.prevMonth());
        this.nextBtn.addEventListener('click', () => this.nextMonth());
        
        this.startDate.addEventListener('change', () => this.renderCalendar());
        
        document.querySelector('.close-modal').addEventListener('click', () => this.closeModal());
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
        
        document.querySelectorAll('.view-stops-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.showStops(e.target.dataset.route));
        });
    }

    async loadRoutes() {
        try {
            const response = await fetch('/api/routes');
            this.routes = await response.json();
        } catch (error) {
            console.error('Error loading routes:', error);
            this.showMessage('Error loading route data', 'error');
        }
    }

    setDefaultDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        this.startDate.value = `${year}-${month}-${day}`;
        this.currentMonth = new Date(today);
    }

    initCalendar() {
        this.renderCalendar();
    }

    renderCalendar() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        this.monthDisplay.textContent = new Date(year, month).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });

        this.calendar.innerHTML = '';

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-header';
            header.textContent = day;
            this.calendar.appendChild(header);
        });

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const weekStart = new Date(this.startDate.value + 'T00:00:00');
        const weekStartLocal = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
        const weekEndLocal = new Date(weekStartLocal);
        weekEndLocal.setDate(weekStartLocal.getDate() + 6);
        
        const calStart = new Date(firstDay);
        calStart.setDate(calStart.getDate() - firstDay.getDay());
        
        const calEnd = new Date(year, month + 1, 0);
        if (calEnd.getDay() !== 6) {
            const daysToAdd = 6 - calEnd.getDay();
            calEnd.setDate(calEnd.getDate() + daysToAdd);
        }
        
        const daysDiff = Math.round((calEnd.getTime() - calStart.getTime()) / (24 * 60 * 60 * 1000));
        const totalDays = daysDiff + 1;
        
        for (let i = 0; i < totalDays; i++) {
            const currentDate = new Date(calStart);
            currentDate.setDate(calStart.getDate() + i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            if (currentDate.getMonth() !== month) {
                dayElement.classList.add('other-month');
            }
            
            const today = new Date();
            const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const currentDateLocal = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
            
            if (currentDateLocal.getTime() === todayLocal.getTime()) {
                dayElement.classList.add('today');
            }
            
            if (currentDateLocal >= weekStartLocal && currentDateLocal <= weekEndLocal) {
                dayElement.classList.add('selected-week');
            }
            
            const dayNumber = document.createElement('div');
            dayNumber.className = 'calendar-day-number';
            dayNumber.textContent = currentDate.getDate();
            dayElement.appendChild(dayNumber);
            
            this.addEventsToDay(dayElement, currentDate);
            this.calendar.appendChild(dayElement);
        }
    }

    addEventsToDay(dayElement, date) {
        const items = this.getItems();
        if (items.length === 0) return;

        const weekStart = new Date(this.startDate.value + 'T00:00:00');
        const weekStartLocal = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
        const weekEndLocal = new Date(weekStartLocal);
        weekEndLocal.setDate(weekStartLocal.getDate() + 6);
        
        const dateLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        if (dateLocal < weekStartLocal || dateLocal > weekEndLocal) return;

        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'calendar-events';

        items.forEach(item => {
            if (item.days.includes(dayName)) {
                const event = document.createElement('div');
                event.className = `calendar-event ${item.routeId.toLowerCase()}`;
                event.title = `${item.routeId}: ${item.stopName} at ${item.time}`;
                
                const stopName = document.createElement('div');
                stopName.className = 'event-stop';
                stopName.textContent = item.stopName.length > 20 ? 
                    item.stopName.substring(0, 20) + '...' : item.stopName;
                
                const details = document.createElement('div');
                details.className = 'event-details';
                
                const routeBadge = document.createElement('span');
                routeBadge.className = 'event-route';
                routeBadge.textContent = item.routeId;
                
                const timeText = document.createElement('span');
                timeText.className = 'event-time';
                timeText.textContent = item.time;
                
                details.appendChild(routeBadge);
                details.appendChild(timeText);
                
                event.appendChild(stopName);
                event.appendChild(details);
                eventsContainer.appendChild(event);
            }
        });

        if (eventsContainer.children.length > 0) {
            dayElement.appendChild(eventsContainer);
            
            if (eventsContainer.children.length > 3) {
                const moreIndicator = document.createElement('div');
                moreIndicator.className = 'more-events-indicator';
                moreIndicator.textContent = `+${eventsContainer.children.length - 3} more`;
                moreIndicator.title = `Scroll to see ${eventsContainer.children.length} total events`;
                dayElement.appendChild(moreIndicator);
            }
        }
    }

    prevMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
        this.renderCalendar();
    }

    nextMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
        this.renderCalendar();
    }

    addItem() {
        this.counter++;
        const item = this.createItem();
        this.itemsContainer.appendChild(item);
        
        this.updateGenerateBtn();
        this.populateRoutes(item);
        this.renderCalendar();
    }

    createItem() {
        const template = this.itemTemplate.content.cloneNode(true);
        const item = template.querySelector('.stop-item');
        
        item.querySelector('.stop-number').textContent = `Stop ${this.counter}`;
        
        const header = item.querySelector('.stop-header');
        const deleteBtn = item.querySelector('.delete-stop');
        
        header.addEventListener('click', () => this.toggleItem(item));
        deleteBtn.addEventListener('click', () => this.removeItem(item));
        
        const routeSelect = item.querySelector('.route-select');
        const stopSelect = item.querySelector('.stop-select');
        const timeSelect = item.querySelector('.time-select');
        
        routeSelect.addEventListener('change', () => this.onRouteChange(item));
        stopSelect.addEventListener('change', () => this.onStopChange(item));
        timeSelect.addEventListener('change', () => this.onTimeChange(item));
        
        const dayButtons = item.querySelectorAll('.day-btn');
        dayButtons.forEach(button => {
            button.addEventListener('click', () => this.onDayClick(button, item));
        });
        
        return item;
    }

    populateRoutes(item) {
        const routeSelect = item.querySelector('.route-select');
        routeSelect.innerHTML = '<option value="">Choose route</option>';
        
        Object.keys(this.routes.routes).forEach(routeId => {
            const route = this.routes.routes[routeId];
            const option = document.createElement('option');
            option.value = routeId;
            option.textContent = `${routeId} - ${route.description}`;
            routeSelect.appendChild(option);
        });
    }

    onRouteChange(item) {
        const routeSelect = item.querySelector('.route-select');
        const stopSelect = item.querySelector('.stop-select');
        const timeSelect = item.querySelector('.time-select');
        
        const selectedRoute = routeSelect.value;
        
        stopSelect.innerHTML = '<option value="">Choose stop</option>';
        timeSelect.innerHTML = '<option value="">Choose time</option>';
        
        this.resetDays(item);
        
        if (selectedRoute) {
            this.populateStops(item, selectedRoute);
        }
        
        this.renderCalendar();
    }

    populateStops(item, routeId) {
        const stopSelect = item.querySelector('.stop-select');
        stopSelect.innerHTML = '<option value="">Choose stop</option>';
        
        const route = this.routes.routes[routeId];
        route.stops.forEach(stop => {
            const option = document.createElement('option');
            option.value = stop.name;
            option.textContent = `${stop.name}${stop.description ? ` - ${stop.description}` : ''}`;
            stopSelect.appendChild(option);
        });
    }

    onStopChange(item) {
        const routeSelect = item.querySelector('.route-select');
        const stopSelect = item.querySelector('.stop-select');
        const timeSelect = item.querySelector('.time-select');
        
        const selectedRoute = routeSelect.value;
        const selectedStop = stopSelect.value;
        
        this.resetDays(item);
        
        if (selectedRoute && selectedStop) {
            this.populateTimes(item, selectedRoute, selectedStop);
        }
        
        this.renderCalendar();
    }

    onTimeChange(item) {
        const timeSelect = item.querySelector('.time-select');
        const selectedTime = timeSelect.value;
        
        if (selectedTime) {
            const routeSelect = item.querySelector('.route-select');
            const stopSelect = item.querySelector('.stop-select');
            const selectedRoute = routeSelect.value;
            const selectedStop = stopSelect.value;
            
            if (selectedRoute && selectedStop) {
                const route = this.routes.routes[selectedRoute];
                const stopIndex = route.stops.findIndex(stop => stop.name === selectedStop);
                
                if (stopIndex !== -1) {
                    const dayButtons = item.querySelectorAll('.day-btn');
                    
                    dayButtons.forEach(button => {
                        const dayName = button.dataset.day;
                        const isWeekend = dayName === 'Saturday' || dayName === 'Sunday';
                        const isWeekday = dayName === 'Monday' || dayName === 'Tuesday' || 
                                        dayName === 'Wednesday' || dayName === 'Thursday' || dayName === 'Friday';
                        
                        const weekendTimes = route.schedules.weekend.times[stopIndex];
                        const timeExistsOnWeekend = weekendTimes && weekendTimes.includes(selectedTime);
                        
                        const weekdayTimes = route.schedules.weekday.times[stopIndex];
                        const timeExistsOnWeekday = weekdayTimes && weekdayTimes.includes(selectedTime);
                        
                        if (isWeekend) {
                            button.disabled = !timeExistsOnWeekend;
                            if (!timeExistsOnWeekend) {
                                button.classList.remove('selected');
                            }
                        } else if (isWeekday) {
                            button.disabled = !timeExistsOnWeekday;
                            if (!timeExistsOnWeekday) {
                                button.classList.remove('selected');
                            }
                        }
                    });
                }
            }
            
        this.renderCalendar();
        }
    }

    onDayClick(button, item) {
        button.classList.toggle('selected');
        this.renderCalendar();
    }

    resetDays(item) {
        const dayButtons = item.querySelectorAll('.day-btn');
        dayButtons.forEach(button => {
            button.classList.remove('selected');
        });
    }

    populateTimes(item, routeId, stopName) {
        const timeSelect = item.querySelector('.time-select');
        timeSelect.innerHTML = '<option value="">Choose time</option>';
        
        const route = this.routes.routes[routeId];
        const stopIndex = route.stops.findIndex(stop => stop.name === stopName);
        
        if (stopIndex !== -1) {
            const weekdayTimes = route.schedules.weekday.times[stopIndex] || [];
            const weekendTimes = route.schedules.weekend.times[stopIndex] || [];
            
            const allTimes = [...new Set([...weekdayTimes, ...weekendTimes])];
            allTimes.sort((a, b) => {
                const timeA = parseInt(a.replace(':', ''));
                const timeB = parseInt(b.replace(':', ''));
                return timeA - timeB;
            });
            
            allTimes.forEach(time => {
                const option = document.createElement('option');
                option.value = time;
                option.textContent = time;
                timeSelect.appendChild(option);
            });
        }
    }

    toggleItem(item) {
        const content = item.querySelector('.stop-content');
        const header = item.querySelector('.stop-header span:last-child');
        
        if (content.classList.contains('open')) {
            content.classList.remove('open');
            header.textContent = '▼';
        } else {
            content.classList.add('open');
            header.textContent = '▲';
        }
    }

    removeItem(item) {
        item.remove();
        this.updateGenerateBtn();
        this.renderCalendar();
    }

    clearAll() {
        this.itemsContainer.innerHTML = '';
        this.counter = 0;
        this.updateGenerateBtn();
        this.renderCalendar();
    }

    updateGenerateBtn() {
        const hasItems = this.itemsContainer.children.length > 0;
        this.generateBtn.disabled = !hasItems;
    }

    showStops(routeId) {
        const route = this.routes.routes[routeId];
        this.modalTitle.textContent = `${routeId} Route - All Stops`;
        
        this.stopsList.innerHTML = '';
        route.stops.forEach((stop, index) => {
            const stopItem = document.createElement('div');
            stopItem.className = 'stops-list-item';
            stopItem.innerHTML = `
                <div class="stop-info">
                    <span class="stop-number">${index + 1}</span>
                    <div>
                        <div class="stop-name">${stop.name}</div>
                        ${stop.description ? `<div class="stop-description">${stop.description}</div>` : ''}
                    </div>
                </div>
                <button class="btn btn-sm view-times-btn" data-route="${routeId}" data-stop-index="${index}">
                    View Times
                </button>
            `;
            this.stopsList.appendChild(stopItem);
        });
        
        this.stopsList.querySelectorAll('.view-times-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const routeId = e.target.closest('.view-times-btn').dataset.route;
                const stopIndex = parseInt(e.target.closest('.view-times-btn').dataset.stopIndex);
                this.showTimes(routeId, stopIndex);
            });
        });
        
        this.modal.style.display = 'block';
    }

    showTimes(routeId, stopIndex) {
        const route = this.routes.routes[routeId];
        const stop = route.stops[stopIndex];
        const weekdayTimes = route.schedules.weekday.times[stopIndex] || [];
        const weekendTimes = route.schedules.weekend.times[stopIndex] || [];
        
        this.modalTitle.textContent = `${routeId} - ${stop.name} - Schedule Times`;
        
        this.stopsList.innerHTML = `
            <div class="stop-times-container">
                <div class="back-to-stops">
                    <button class="btn btn-secondary back-btn" data-route="${routeId}">
                        Back to All Stops
                    </button>
                </div>
                
                <div class="times-section">
                    <h4>Weekdays (Monday - Friday)</h4>
                    <div class="times-grid">
                        ${weekdayTimes.length > 0 ? 
                            weekdayTimes.map(time => `<span class="time-badge weekday">${time}</span>`).join('') :
                            '<span class="no-times">No weekday service at this stop</span>'
                        }
                    </div>
                </div>
                
                <div class="times-section">
                    <h4>Weekends (Saturday - Sunday)</h4>
                    <div class="times-grid">
                        ${weekendTimes.length > 0 ? 
                            weekendTimes.map(time => `<span class="time-badge weekend">${time}</span>`).join('') :
                            '<span class="no-times">No weekend service at this stop</span>'
                        }
                    </div>
                </div>
                
                <div class="stop-info-section">
                    <h4>Stop Information</h4>
                    <p><strong>Stop #:</strong> ${stopIndex + 1} of ${route.stops.length}</p>
                    <p><strong>Route:</strong> ${routeId} (${routeId === 'Go1' ? 'Inner Loop' : 'Outer Loop'})</p>
                    <p><strong>Estimated Route Time:</strong> 90 minutes</p>
                </div>
            </div>
        `;
        
        this.stopsList.querySelector('.back-btn').addEventListener('click', (e) => {
            const routeId = e.target.closest('.back-btn').dataset.route;
            this.showStops(routeId);
        });
    }

    closeModal() {
        this.modal.style.display = 'none';
    }

    async generateICS() {
        const items = this.getItems();
        
        if (items.length === 0) {
            this.showMessage('No schedule items to generate', 'error');
            return;
        }

        const startDate = this.startDate.value;
        if (!startDate) {
            this.showMessage('Please select a start date', 'error');
            return;
        }

        try {
            this.generateBtn.disabled = true;
            this.generateBtn.textContent = 'Generating...';

            const response = await fetch('/api/generate-ics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    scheduleItems: items,
                    startDate
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate ICS file');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'kv-go-schedule.ics';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showMessage('ICS file generated successfully!', 'success');
            
        } catch (error) {
            this.showMessage('Error generating ICS file', 'error');
        } finally {
            this.generateBtn.disabled = false;
            this.generateBtn.textContent = 'Generate Calendar';
        }
    }

    getItems() {
        const items = [];
        const scheduleItems = this.itemsContainer.querySelectorAll('.stop-item');
        
        scheduleItems.forEach(item => {
            const routeSelect = item.querySelector('.route-select');
            const stopSelect = item.querySelector('.stop-select');
            const timeSelect = item.querySelector('.time-select');
            const selectedDayButtons = item.querySelectorAll('.day-btn.selected');
            
            if (routeSelect.value && stopSelect.value && timeSelect.value && selectedDayButtons.length > 0) {
                const days = Array.from(selectedDayButtons).map(btn => btn.dataset.day);
                
                items.push({
                    routeId: routeSelect.value,
                    stopName: stopSelect.value,
                    time: timeSelect.value,
                    days: days
                });
            }
        });
        
        return items;
    }

    showMessage(message, type) {
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        const title = document.querySelector('h1');
        title.parentNode.insertBefore(messageDiv, title.nextSibling);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ScheduleGenerator();
});
