import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../context/PatientContext';

export default function PatientIntake() {
    const navigate = useNavigate();
    const { updatePatient } = usePatient();
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        mobile: '', // Optional ID/Mobile
    });
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.age) {
            setError('Please provide patient name and age.');
            return;
        }

        updatePatient({
            name: formData.name,
            age: formData.age,
            mobile: formData.mobile,
            timestamp: new Date().toISOString()
        });

        navigate('/setup');
    };

    return (
        <div className="max-w-md mx-auto py-12 px-4 animate-fade-in">
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg ring-1 ring-primary-500/30">
                    🩺
                </div>
                <h1 className="text-3xl font-bold glow-text mb-2">Patient Intake</h1>
                <p className="text-surface-400">Enter patient details to begin session</p>
            </div>

            <div className="card border-primary-500/20 shadow-xl bg-surface-800/80 backdrop-blur-sm">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-surface-300 mb-1.5 ml-1">
                            Patient Name <span className="text-danger-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-surface-900/50 border border-surface-600 rounded-xl px-4 py-3 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                            placeholder="e.g. John Doe"
                        />
                    </div>

                    {/* Age Input */}
                    <div>
                        <label className="block text-sm font-medium text-surface-300 mb-1.5 ml-1">
                            Age <span className="text-danger-400">*</span>
                        </label>
                        <input
                            type="number"
                            value={formData.age}
                            onChange={e => setFormData(prev => ({ ...prev, age: e.target.value }))}
                            className="w-full bg-surface-900/50 border border-surface-600 rounded-xl px-4 py-3 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                            placeholder="e.g. 45"
                        />
                    </div>

                    {/* Mobile/ID Input */}
                    <div>
                        <label className="block text-sm font-medium text-surface-300 mb-1.5 ml-1">
                            Patient ID / Mobile (Optional)
                        </label>
                        <input
                            type="text"
                            value={formData.mobile}
                            onChange={e => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                            className="w-full bg-surface-900/50 border border-surface-600 rounded-xl px-4 py-3 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                            placeholder="e.g. ID-12345"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-400 text-sm flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="btn-primary w-full py-3 text-lg shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 transition-all"
                        >
                            Continue to Setup →
                        </button>
                    </div>
                </form>
            </div>

            <div className="text-center mt-8 text-xs text-surface-500">
                <p>🔒 Patient data is processed locally in this browser session only.</p>
            </div>
        </div>
    );
}
