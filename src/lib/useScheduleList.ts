import {db} from '../models/db';
import { useLiveQuery } from "dexie-react-hooks";

import _ from 'lodash';

const PROPERTY_PREFIX = /^31cal./;

const useScheduleList = () => {
    const list = useLiveQuery(() => {return db.events.toArray()
        .then(q => _.uniq(q
        .filter(e => _.some(_.keys(e.extendedProperties?.shared), k => k.startsWith("31cal")))
        .flatMap(e => _.keys(_.pickBy(e.extendedProperties?.shared, (v, k) => k.startsWith("31cal")))))
        .map(k => k.replace(PROPERTY_PREFIX, ""))
        .map(k => decodeURIComponent(k))
             )
                                    })
    return {
        list
    };
}

export default useScheduleList;
