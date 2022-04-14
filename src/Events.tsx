import React, { useState } from 'react';

import { useRecoilValue } from 'recoil';
import { filteredEvents } from './lib/store';

import EventList from './EventList';
import Filters from './Filters';

function Events() {
  const eventList = useRecoilValue(filteredEvents);

  return (
    <>
      <EventList events={eventList} />
    </>
  );
}

export default Events;
