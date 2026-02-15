import React, { useContext, useCallback } from 'react';
import { db } from '../models/db';

import { useLiveQuery } from 'dexie-react-hooks';


const SettingsContext = React.createContext<Object | undefined>(undefined);

const useSetting = (id: string) => {
  const settings = useContext(SettingsContext);

  const _set = useCallback((value: string | string[]) => {
    db.settings.put({ id: id, value: value });
  }, []);

  if (settings) {
    return [(settings as any)?.[id], _set];
  } else {
    return [undefined, _set];
  }
};

type Props = {
  children?: React.ReactNode;
};

const SettingsProvider: React.FC<Props> = ({ children }) => {
  const settings = useLiveQuery(() =>
    db.settings
      .toArray()
      .then((settingsArray) =>
        Object.fromEntries(settingsArray.map((i) => [i.id, i.value])),
      ),
  );

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
export { SettingsProvider, SettingsContext, useSetting };
