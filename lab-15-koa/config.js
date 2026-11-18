'use strict';

/**
 * Lab 15 - shared configuration.
 * The port can be overridden with the PORT environment variable.
 */
const PORT = Number(process.env.PORT) || 3000;

/** Student data: shown on the HTML page and in the server banner. */
const GROUP = '478';
const STUDENT = {
  fullNameRu: 'Евдокимов Владислав Евгеньевич',
  group: GROUP,
};

/**
 * Group codes for the students generated in task 5.
 * They are derived from the journal group number, as the assignment asks
 * ("данные генерируются на основе номера группы").
 */
const GROUP_CODES = [`${GROUP}-1`, `${GROUP}-2`, `${GROUP}-3`, `${GROUP}-4`];

module.exports = { PORT, GROUP, STUDENT, GROUP_CODES };
