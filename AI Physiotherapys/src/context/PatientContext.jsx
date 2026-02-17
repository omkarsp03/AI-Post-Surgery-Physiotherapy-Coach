import { createContext, useContext, useState, useEffect } from 'react';

const PatientContext = createContext();

export function usePatient() {
    return useContext(PatientContext);
}

export function PatientProvider({ children }) {
    const [patient, setPatient] = useState(() => {
        const saved = localStorage.getItem('current_patient');
        return saved ? JSON.parse(saved) : null;
    });

    const [sessionConfig, setSessionConfig] = useState(() => {
        const saved = localStorage.getItem('session_config');
        return saved ? JSON.parse(saved) : null;
    });

    const [painLevel, setPainLevel] = useState(0);

    useEffect(() => {
        if (patient) {
            localStorage.setItem('current_patient', JSON.stringify(patient));
        } else {
            localStorage.removeItem('current_patient');
        }
    }, [patient]);

    useEffect(() => {
        if (sessionConfig) {
            localStorage.setItem('session_config', JSON.stringify(sessionConfig));
        } else {
            localStorage.removeItem('session_config');
        }
    }, [sessionConfig]);

    const updatePatient = (data) => {
        setPatient(prev => ({ ...prev, ...data }));
    };

    const clearPatient = () => {
        setPatient(null);
        setSessionConfig(null);
        setPainLevel(0);
        localStorage.removeItem('current_patient');
        localStorage.removeItem('session_config');
    };

    const setExerciseConfig = (exerciseId, difficulty) => {
        setSessionConfig({ exerciseId, difficulty });
    };

    const value = {
        patient,
        sessionConfig,
        painLevel,
        setPainLevel,
        updatePatient,
        clearPatient,
        setExerciseConfig
    };

    return (
        <PatientContext.Provider value={value}>
            {children}
        </PatientContext.Provider>
    );
}
