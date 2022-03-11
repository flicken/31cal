import React, {useContext, useCallback} from 'react';
import {db} from '../models/db';

import { useLiveQuery } from "dexie-react-hooks";

import _ from 'lodash';

const SettingsContext = React.createContext<Object|undefined>(undefined);

const useSetting = (id: string) => {
    const settings = useContext(SettingsContext);

    const _set = useCallback((value) => {
        db.settings.put({ id: id, value: value });
    }, []);

    if (settings) {
        return [_.get(settings, id), _set];
    } else {
        return [undefined, _set];
    }
    
}

const SettingsProvider: React.FunctionComponent = (props) => {
    const settings = useLiveQuery(() => db.settings.toArray()
        .then(settingsArray => _.fromPairs(settingsArray.map(i =>
            [i.id, i.value]))))

  	return (
		    <SettingsContext.Provider value={settings}>
			      {props.children}
		    </SettingsContext.Provider>
	  );
}

export default SettingsContext;
export { SettingsProvider, SettingsContext, useSetting }
