import React, { useState, useCallback, useMemo } from 'react';

import PapaParse from 'papaparse'

import {useDropzone, FileRejection, DropEvent } from 'react-dropzone';

const parserOptions = {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: (header: string) =>
        header
            .toLowerCase()
            .replace(/\W/g, '_')
}

const baseStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as 'column',
    alignItems: 'center',
    padding: '20px',
    borderWidth: 2,
    borderRadius: 2,
    borderColor: '#eeeeee',
    borderStyle: 'dashed',
    backgroundColor: '#fafafa',
    color: '#bdbdbd',
    outline: 'none',
    transition: 'border .24s ease-in-out'
};

const focusedStyle = { 
    borderColor: '#2196f3'
};

const acceptStyle = {
    borderColor: '#00e676'
};

const rejectStyle = {
    borderColor: '#ff1744'
};

function ImportFile() {
    const [events, setEvents] = useState<Array<any>>([]);
    const onDrop = useCallback((
        acceptedFiles: File[],
        fileRejections: FileRejection[],
        e: DropEvent
    ) => {
        const fileEncoding = 'UTF-8';
        const onError = (error: any) => {
            console.log(onError);
        };
        acceptedFiles.forEach(file => {
            let reader: FileReader = new FileReader()
            reader.onload = (_event: Event) => {
                const csvData = PapaParse.parse(
                    reader.result as string,
                    Object.assign(parserOptions, {
                        error: onError,
                        encoding: fileEncoding,
                    }),
                )
                setEvents(previousEvents => [...previousEvents, ...(csvData?.data ?? [])]);
            }

            reader.readAsText(file, fileEncoding)
        });
    }, [setEvents]);

    const {
        getRootProps,
        getInputProps,
        isFocused,
        isDragAccept,
        isDragReject,
        isDragActive,
    } = useDropzone({accept: 'text/*', onDrop });

    const style = useMemo(() => ({
        ...baseStyle,
        ...(isDragActive ? focusedStyle : {}),
        ...(isDragAccept ? acceptStyle : {}),
        ...(isDragReject ? rejectStyle : {})
    }), [
        isDragActive,
        isDragAccept,
        isDragReject,
    ]);

    return (<>
          <div {...getRootProps({style})} >
            <input {...getInputProps()} />
        {
            isFocused ?
            <p>Drop the csv files here ...</p> :
            <p>Drag 'n' drop csv files here, or click to select files</p>
        }

        </div>
        { events && (<ul>
            {events.map((e, i) => (<li key={i}>{JSON.stringify(e)}</li>))}
        </ul>)
        }
        </>
    )
}

export default ImportFile;
