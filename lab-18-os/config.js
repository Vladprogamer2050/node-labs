'use strict';

module.exports = {
  lab: 18,
  group: '478',
  variant: 7,
  student: {
    fullName: 'Евдокимов Владислав Евгеньевич',
    shortName: 'Владислав',
  },
  thresholds: {
    /** Free RAM below this percentage is reported as low (task 2). */
    freeMemory: 20,
    /** Real-time monitor levels (task 4). */
    cpuWarning: 50,
    cpuCritical: 80,
    freeMemoryCritical: 10,
  },
  logFile: 'monitor.log',
};
