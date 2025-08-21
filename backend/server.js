const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createEvents } = require('ics');
const moment = require('moment-timezone');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const routesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'routes.json'), 'utf8'));
app.get('/api/routes', (req, res) => {
    res.json(routesData);
});

app.get('/api/routes/:routeId', (req, res) => {
    const { routeId } = req.params;
    const route = routesData.routes[routeId];
    
    if (!route) {
        return res.status(404).json({ error: 'Route not found' });
    }
    
    res.json(route);
});

app.get('/api/stops', (req, res) => {
    const { routeId } = req.query;
    
    if (routeId) {
        const route = routesData.routes[routeId];
        if (!route) {
            return res.status(404).json({ error: 'Route not found' });
        }
        res.json(route.stops);
    } else {
        const allStops = {};
        Object.keys(routesData.routes).forEach(routeId => {
            allStops[routeId] = routesData.routes[routeId].stops;
        });
        res.json(allStops);
    }
});

app.get('/api/schedule', (req, res) => {
    const { routeId, dayType } = req.query;
    
    if (!routeId || !dayType) {
        return res.status(400).json({ error: 'Route ID and day type are required' });
    }
    
    const route = routesData.routes[routeId];
    if (!route) {
        return res.status(404).json({ error: 'Route not found' });
    }
    
    const schedule = route.schedules[dayType];
    if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
    }
    
    res.json(schedule);
});

app.post('/api/generate-ics', (req, res) => {
    try {
        const { scheduleItems, startDate } = req.body;
        
        if (!scheduleItems || !Array.isArray(scheduleItems) || !startDate) {
            return res.status(400).json({ error: 'Invalid request data' });
        }
        
        const events = [];
        const startMoment = moment.tz(startDate, 'America/Halifax');
        
        scheduleItems.forEach(item => {
            const { routeId, stopName, time, days } = item;
            
            days.forEach(day => {
                const dayOffset = getDayOffset(day, startMoment);
                const eventDate = startMoment.clone().add(dayOffset, 'days');
                
                const [hours, minutes] = time.split(':').map(Number);
                eventDate.hours(hours).minutes(minutes).seconds(0);
                
                const event = {
                    start: [
                        eventDate.year(),
                        eventDate.month() + 1,
                        eventDate.date(),
                        eventDate.hours(),
                        eventDate.minutes()
                    ],
                    duration: { minutes: 5 },
                    title: `KV Go Bus - ${routeId}`,
                    description: `Bus arrival at ${stopName}`,
                    location: stopName,
                    status: 'CONFIRMED',
                    busyStatus: 'FREE'
                };
                
                events.push(event);
            });
        });
        
        const { error, value } = createEvents(events);
        
        if (error) {
            return res.status(500).json({ error: 'Failed to generate ICS file' });
        }
        
        res.setHeader('Content-Type', 'text/calendar');
        res.setHeader('Content-Disposition', 'attachment; filename="kv-go-schedule.ics"');
        res.send(value);
        
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

function getDayOffset(dayName, startMoment) {
    const dayMap = {
        'Sunday': 0,
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5,
        'Saturday': 6
    };
    
    const targetDay = dayMap[dayName];
    const startDay = startMoment.day();
    
    let offset = targetDay - startDay;
    if (offset < 0) {
        offset += 7;
    }
    
    return offset;
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});
app.listen(PORT, () => {
    console.log(`KV Go Schedule Generator server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});
