/**
 * PDF Report generator using jsPDF and jspdf-autotable.
 */
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import exercises from '../data/exercises.json';

// Import images (ensure these exist in src/assets/exercises/)
// We use a try-catch pattern or dynamic import for safety, but imports must be static for Vite
import kneeExtensionImg from '../assets/exercises/knee-extension.png';
// Add others here once generated

const EXERCISE_IMAGES = {
    'knee-extension': kneeExtensionImg,
};

export function generateSessionReport(session, patient, exercise) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // --- Header ---
    doc.setFontSize(22);
    doc.setTextColor(25, 63, 143);
    doc.text('Clinical Physio Session Report', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 35, pageWidth - 14, 35);
    y = 45;

    // --- Patient Details ---
    doc.setFillColor(240, 245, 255);
    doc.rect(14, y, pageWidth - 28, 25, 'F');

    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`Patient Name:`, 20, y + 8);
    doc.setFont(undefined, 'bold');
    doc.text(patient?.name || 'Unknown', 50, y + 8);

    doc.setFont(undefined, 'normal');
    doc.text('Age:', 120, y + 8);
    doc.setFont(undefined, 'bold');
    doc.text(patient?.age?.toString() || '-', 135, y + 8);

    doc.setFont(undefined, 'normal');
    if (patient?.mobile) {
        doc.text('ID/Mobile:', 120, y + 18);
        doc.setFont(undefined, 'bold');
        doc.text(patient.mobile, 145, y + 18);
    }

    y += 35;

    // --- Exercise Summary ---
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text('Exercise Summary', 14, y);
    y += 10;

    const summaryData = [
        ['Exercise', exercise.name],
        ['Difficulty Level', session.difficulty || 'Standard'],
        ['Total Reps', session.repsCompleted],
        ['Sets Completed', session.setsCompleted],
        ['Duration', `${Math.floor(session.duration / 60)}m ${session.duration % 60}s`],
        ['Avg Symmetry', `${session.symmetryScore}%`],
        ['Pain Level', `${session.painLevel}/10`],
    ];

    doc.autoTable({
        startY: y,
        body: summaryData,
        theme: 'grid',
        styles: { fontSize: 11, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245], width: 60 } },
    });
    y = doc.lastAutoTable.finalY + 15;

    // --- Biomechanics Analysis ---
    doc.setFontSize(14);
    doc.text('Biomechanics Analysis', 14, y);
    y += 8;

    const bioData = [
        ['Movement Quality', `${session.avgQuality || '-'}%`, session.qualityLabel || '-'],
        ['Max ROM Achieved', `${Math.round(session.currentROM || 0)}°`, ''],
        ['Fatigue Level', session.fatigueLevel || 'None', session.fatigueScore ? `Score: ${session.fatigueScore}` : ''],
        ['Avg Rep Speed', `${session.avgRepSpeed ? session.avgRepSpeed.toFixed(1) : '-'} s/rep`, ''],
    ];

    doc.autoTable({
        startY: y,
        head: [['Metric', 'Value', 'Notes']],
        body: bioData,
        theme: 'striped',
        headStyles: { fillColor: [51, 141, 255] },
    });
    y = doc.lastAutoTable.finalY + 15;

    // Footer
    addFooter(doc);

    // Save
    const patientName = patient?.name || 'Patient';
    const filename = `${patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    try {
        doc.save(filename);
    } catch (err) {
        console.error("PDF Download failed:", err);
    }
}

export function generateReport(sessions = [], milestones = []) {
    const doc = new jsPDF();
    let y = 20;

    // --- Header ---
    addHeader(doc, 'Comprehensive Recovery Report');
    y = 50;

    // --- Summary Stats ---
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text('Performance Summary', 14, y);
    y += 10;

    const totalReps = sessions.reduce((sum, s) => sum + (s.repsCompleted || 0), 0);
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgSymmetry = sessions.length > 0 ? Math.round(sessions.reduce((sum, s) => sum + (s.symmetryScore || 0), 0) / sessions.length) : 0;
    const avgPain = sessions.length > 0 ? (sessions.reduce((sum, s) => sum + (s.painLevel || 0), 0) / sessions.length).toFixed(1) : 0;

    const summaryData = [
        ['Total Sessions', sessions.length],
        ['Total Reps', totalReps],
        ['Total Duration', `${Math.round(totalDuration / 60)} mins`],
        ['Avg Symmetry', `${avgSymmetry}%`],
        ['Avg Pain Level', `${avgPain}/10`],
    ];

    doc.autoTable({
        startY: y,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [51, 141, 255] },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 15;

    // --- Per-Exercise Breakdown ---
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text('Exercise Details', 14, y);
    y += 10;

    // Group sessions by exercise
    const sessionsByExercise = {};
    sessions.forEach(s => {
        if (!sessionsByExercise[s.exerciseId]) sessionsByExercise[s.exerciseId] = [];
        sessionsByExercise[s.exerciseId].push(s);
    });

    Object.keys(sessionsByExercise).forEach(exId => {
        const exSessions = sessionsByExercise[exId];
        const exDef = exercises.find(e => e.id === exId);

        if (y > 250) { doc.addPage(); y = 20; }

        doc.setFontSize(12);
        doc.setTextColor(51, 141, 255);
        doc.text(`${exDef ? exDef.name : exId}`, 14, y);
        y += 7;

        // Exercise Image if available
        if (EXERCISE_IMAGES[exId]) {
            try {
                // Aspect ratio 1:1 usually, scale to 40x40
                doc.addImage(EXERCISE_IMAGES[exId], 'PNG', 14, y, 40, 40);

                // Text description next to image
                doc.setFontSize(9);
                doc.setTextColor(80, 80, 80);
                const splitDesc = doc.splitTextToSize(exDef?.description || '', 120);
                doc.text(splitDesc, 60, y + 10);

                y += 45;
            } catch (e) {
                console.warn('Failed to add image to PDF', e);
            }
        } else {
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            const splitDesc = doc.splitTextToSize(exDef?.description || '', 180);
            doc.text(splitDesc, 14, y);
            y += splitDesc.length * 5 + 5;
        }

        // Table for this exercise
        const tableData = exSessions.slice().reverse().map(s => [
            new Date(s.timestamp).toLocaleDateString(),
            s.repsCompleted,
            `${s.symmetryScore}%`,
            `${s.painLevel}/10`,
            `${Math.floor(s.duration / 60)}:${(s.duration % 60).toString().padStart(2, '0')}`
        ]);

        doc.autoTable({
            startY: y,
            head: [['Date', 'Reps', 'Symmetry', 'Pain', 'Duration']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [100, 116, 139] }, // Surface-500ish
            margin: { left: 14, right: 14 },
        });

        y = doc.lastAutoTable.finalY + 15;
    });

    // --- Milestones ---
    if (milestones && milestones.length > 0) { // Safety check
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(14);
        doc.setTextColor(30, 30, 30);
        doc.text('Milestones Achieved', 14, y);
        y += 10;

        const mileData = milestones.map(m => [
            new Date(m.earnedAt).toLocaleDateString(),
            m.name || 'Milestone',
            m.description || ''
        ]);

        doc.autoTable({
            startY: y,
            head: [['Date Earned', 'Milestone', 'Description']],
            body: mileData,
            theme: 'plain',
            styles: { fontSize: 9 },
            columnStyles: { 0: { fontStyle: 'bold' } }
        });
        y = doc.lastAutoTable.finalY + 10;
    }

    addFooter(doc);
    try {
        doc.save('physiotherapy-comprehensive-report.pdf');
    } catch (err) {
        console.error("PDF Download failed:", err);
        alert("Failed to download PDF. Please check console for details.");
    }
}

export function generateExerciseReport(sessions, exerciseId, exerciseDef) {
    const doc = new jsPDF();
    const exSessions = sessions.filter(s => s.exerciseId === exerciseId);
    let y = 20;

    addHeader(doc, `${exerciseDef.name} Report`);
    y = 50;

    // Image
    if (EXERCISE_IMAGES[exerciseId]) {
        try {
            doc.addImage(EXERCISE_IMAGES[exerciseId], 'PNG', 14, y, 50, 50);

            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60);
            const splitDesc = doc.splitTextToSize(exerciseDef.description, 110);
            doc.text(splitDesc, 70, y + 10);

            y += 55;
        } catch (e) { console.warn(e); }
    } else {
        doc.setFontSize(10);
        doc.text(exerciseDef.description, 14, y);
        y += 20;
    }

    // Stats
    const totalReps = exSessions.reduce((sum, s) => sum + (s.repsCompleted || 0), 0);
    const avgSym = exSessions.length > 0 ? Math.round(exSessions.reduce((sum, s) => sum + (s.symmetryScore || 0), 0) / exSessions.length) : 0;
    const maxRom = Math.max(...exSessions.map(s => s.currentROM || 0), 0);

    doc.autoTable({
        startY: y,
        head: [['Total Reps', 'Avg Symmetry', 'Best ROM', 'Sessions']],
        body: [[totalReps, `${avgSym}%`, `${Math.round(maxRom)}°`, exSessions.length]],
        theme: 'striped',
        headStyles: { fillColor: [51, 141, 255] }
    });
    y = doc.lastAutoTable.finalY + 15;

    // History
    doc.text('Session History', 14, y);
    y += 8;

    const tableData = exSessions.slice().reverse().map(s => [
        new Date(s.timestamp).toLocaleDateString(),
        s.repsCompleted,
        s.setsCompleted,
        `${s.symmetryScore}%`,
        `${s.painLevel}/10`,
        s.currentROM ? `${Math.round(s.currentROM)}°` : '-'
    ]);

    doc.autoTable({
        startY: y,
        head: [['Date', 'Reps', 'Sets', 'Symmetry', 'Pain', 'ROM']],
        body: tableData,
    });

    addFooter(doc);
    try {
        doc.save(`${exerciseId}-report.pdf`);
    } catch (err) {
        console.error("PDF Download failed:", err);
        alert("Failed to download PDF. Please check console for details.");
    }
}

function addHeader(doc, title) {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(22);
    doc.setTextColor(25, 63, 143); // Primary Blue
    doc.text(title, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 35, pageWidth - 14, 35);
}

function addFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('AI Post-Surgery Physiotherapy Coach • Local Data Only', pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
    }
}
