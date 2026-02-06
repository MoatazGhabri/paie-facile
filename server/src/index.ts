import express from 'express';
import cors from 'cors';
import sequelize from './sequelize';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { Employee } from './models/Employee';
import { Company } from './models/Company';
import { Salary } from './models/Salary';
import { Counter } from './models/Counter';
import { User } from './models/User';
import { UserRole } from './models/UserRole';
import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import PDFDocument from 'pdfkit';

const app = express();
const PORT = process.env.SERVER_PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- AUTH ---

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email }, include: [UserRole] });

        if (!user) {
            res.status(401).json({ error: 'Identifiants invalides' });
            return;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            res.status(401).json({ error: 'Identifiants invalides' });
            return;
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, roles: user.roles.map((r: any) => r.role) },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            user: { id: user.id, email: user.email },
            roles: user.roles.map((r: any) => r.role),
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
});

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({ status: 'ok', message: 'Database connected successfully via Sequelize', timestamp: new Date() });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Database connection failed', error });
    }
});

// --- EMPLOYEES ---

const generateEmployeeCode = async () => {
    const counter = await Counter.findOne({ where: { entity: 'employee' } });
    let nextValue = 1;
    if (counter) {
        nextValue = counter.last_value + 1;
        counter.last_value = nextValue;
        await counter.save();
    } else {
        await Counter.create({ entity: 'employee', last_value: 1 });
    }
    return `EMP-${String(nextValue).padStart(3, '0')}`;
};

app.get('/api/employees', async (req, res) => {
    try {
        const employees = await Employee.findAll({
            order: [['created_at', 'DESC']]
        });
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

app.post('/api/employees', async (req, res) => {
    try {
        const rawData = req.body;
        // Generate code if not provided or likely temp
        if (!rawData.code || rawData.code === 'TEMP') {
            rawData.code = await generateEmployeeCode();
        }

        const employee = await Employee.create(rawData);
        res.json(employee);
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ error: 'Failed to create employee', details: error });
    }
});

app.put('/api/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await Employee.update(req.body, { where: { id } });
        if (updated) {
            const updatedEmployee = await Employee.findByPk(id);
            res.json(updatedEmployee);
        } else {
            res.status(404).json({ error: 'Employee not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update employee' });
    }
});

app.delete('/api/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Employee.destroy({ where: { id } });
        res.json({ message: 'Employee deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete employee' });
    }
});

// --- SALARIES ---

app.get('/api/salaries', async (req, res) => {
    try {
        const { year, month } = req.query;
        const whereClause: any = {};
        if (year) whereClause.year = Number(year);
        if (month) whereClause.month = Number(month);

        const salaries = await Salary.findAll({
            where: whereClause,
            include: [Employee],
            order: [['created_at', 'DESC']]
        });
        console.log(`Fetched ${salaries.length} salaries for filters:`, whereClause);
        res.json(salaries);
    } catch (error) {
        console.error('Failed to fetch salaries:', error);
        res.status(500).json({ error: 'Failed to fetch salaries' });
    }
});

app.post('/api/salaries', async (req, res) => {
    try {
        const { employee_id, year, month } = req.body;

        // Check uniqueness
        const existing = await Salary.findOne({
            where: {
                employee_id,
                year: Number(year),
                month: Number(month)
            }
        });

        if (existing) {
            res.status(409).json({ error: 'Un salaire existe déjà pour cet employé ce mois-ci' });
            return;
        }

        const salary = await Salary.create({
            ...req.body,
            year: Number(year),
            month: Number(month),
            salaire: Number(req.body.salaire),
            prime: Number(req.body.prime) || 0,
            absence: Number(req.body.absence) || 0,
            avance: Number(req.body.avance) || 0,
            date_avance: req.body.date_avance || null
        });
        const salaryWithEmployee = await Salary.findByPk(salary.id, { include: [Employee] });
        res.json(salaryWithEmployee);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create salary' });
    }
});

app.put('/api/salaries/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await Salary.update({
            ...req.body,
            year: req.body.year !== undefined ? Number(req.body.year) : undefined,
            month: req.body.month !== undefined ? Number(req.body.month) : undefined,
            salaire: req.body.salaire !== undefined ? Number(req.body.salaire) : undefined,
            prime: req.body.prime !== undefined ? Number(req.body.prime) : undefined,
            absence: req.body.absence !== undefined ? Number(req.body.absence) : undefined,
            avance: req.body.avance !== undefined ? Number(req.body.avance) : undefined,
            date_avance: req.body.date_avance !== undefined ? req.body.date_avance : undefined
        }, { where: { id } });
        if (updated) {
            const updatedSalary = await Salary.findByPk(id, { include: [Employee] });
            res.json(updatedSalary);
        } else {
            res.status(404).json({ error: 'Salary not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update salary' });
    }
});

app.delete('/api/salaries/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Salary.destroy({ where: { id } });
        res.json({ message: 'Salary deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete salary' });
    }
});

// --- COMPANY ---

app.get('/api/company', async (req, res) => {
    try {
        const company = await Company.findOne();
        res.json(company);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch company' });
    }
});

app.post('/api/company', async (req, res) => {
    try {
        const existing = await Company.findOne();
        let company;
        if (existing) {
            await existing.update(req.body);
            company = existing;
        } else {
            company = await Company.create(req.body);
        }
        res.json(company);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save company settings' });
    }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ publicUrl: fileUrl });
});

app.post('/api/generate-payslip', async (req, res) => {
    try {
        const { salaryId } = req.body;
        const salary = await Salary.findByPk(salaryId, { include: [Employee] });
        const company = await Company.findOne();

        if (!salary || !salary.employee) {
            res.status(404).json({ error: 'Salaire ou employé non trouvé' });
            return;
        }

        const MONTHS_FR = [
            '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];

        const getWorkingDaysCount = (y: number, m: number) => {
            let count = 0;
            const daysInMonth = new Date(y, m, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(y, m - 1, d);
                if (date.getDay() !== 0) count++; // 0 is Sunday
            }
            return count;
        };

        const totalWorkingDays = getWorkingDaysCount(salary.year, salary.month);
        const absenceDays = Number(salary.absence) || 0;
        const workedDays = totalWorkingDays - absenceDays;

        const salaireAmount = Number(salary.salaire);
        const dailyRate = salaireAmount / totalWorkingDays;
        const basePayForWorkedDays = dailyRate * workedDays;

        const primeAmount = Number(salary.prime) || 0;
        const avanceAmount = Number(salary.avance) || 0;
        const netTotal = basePayForWorkedDays + primeAmount - avanceAmount;

        const doc = new PDFDocument({ margin: 20, size: 'A5' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=bulletin-${salary.employee?.code}.pdf`);

        doc.pipe(res);

        // --- HEADER ---
        const headerY = 20;

        // Logo
        if (company?.logo_url) {
            try {
                if (company.logo_url.includes('/uploads/')) {
                    const filename = company.logo_url.split('/uploads/').pop();
                    const localPath = path.join(__dirname, '../uploads', filename!);
                    if (fs.existsSync(localPath)) {
                        doc.image(localPath, 25, headerY, { width: 55 });
                    }
                }
            } catch (e) {
                console.error('Logo loading error:', e);
            }
        }

        // Company info
        doc.font('Helvetica-Bold').fontSize(11).text(company?.nom || '', 85, headerY);
        doc.font('Helvetica').fontSize(7);
        doc.text(`CNSS Employeur : ${company?.cnss_employeur || ''}`, 85, headerY + 14);
        doc.text(`R.I.B : ${company?.rib || ''}`, 85, headerY + 22);
        doc.text(`Adresse : ${company?.adresse || ''} ${company?.ville || ''}`, 85, headerY + 30);

        // Title and Date
        doc.font('Helvetica-Bold').fontSize(11).text('BULLETIN DE PAIE', 250, headerY, { align: 'right' });
        doc.font('Helvetica-Bold').fontSize(9).text(`Mois : ${MONTHS_FR[salary.month]} ${salary.year}`, 250, headerY + 20, { align: 'right' });

        // --- EMPLOYEE SECTION ---
        let currentY = 70;
        doc.rect(20, currentY, 380, 60).stroke();

        doc.fontSize(8);
        // Left Column
        doc.font('Helvetica-Bold').text('Matricule :', 30, currentY + 8);
        doc.font('Helvetica').text(salary.employee.code, 80, currentY + 8);
        doc.font('Helvetica-Bold').text('Nom & prénoms :', 30, currentY + 20);
        doc.font('Helvetica').text(`${salary.employee.nom} ${salary.employee.prenom}`.toUpperCase(), 105, currentY + 20);
        doc.font('Helvetica-Bold').text('N° CIN/Passeport :', 30, currentY + 32);
        doc.font('Helvetica').text(salary.employee.cin, 105, currentY + 32);

        // Right Column
        doc.font('Helvetica-Bold').text('Service :', 210, currentY + 8);
        doc.font('Helvetica').text(salary.employee.service || '', 250, currentY + 8);

        doc.font('Helvetica-Bold').text('Dat.Emb. :', 210, currentY + 20);
        doc.font('Helvetica').text(salary.employee.date_embauche, 255, currentY + 20);

        doc.font('Helvetica-Bold').text('Emploi :', 210, currentY + 32);
        doc.font('Helvetica').text(salary.employee.poste || '', 245, currentY + 32);

        doc.font('Helvetica-Bold').text('Sal.B :', 320, currentY + 20);
        doc.font('Helvetica').text(Number(salary.salaire).toFixed(3), 350, currentY + 20);

        doc.font('Helvetica-Bold').text('Contrat :', 320, currentY + 32);
        doc.font('Helvetica').text(salary.employee.type_contrat, 360, currentY + 32);

        // --- TABLE SECTION ---
        currentY = 135;
        const tableHeaderY = currentY;
        const tableHeight = 350;
        doc.rect(20, tableHeaderY, 380, tableHeight).stroke();

        // Header line
        doc.moveTo(20, tableHeaderY + 15).lineTo(400, tableHeaderY + 15).stroke();

        // Vertical lines
        const cols = [20, 60, 190, 235, 275, 335, 400];
        cols.forEach(x => {
            doc.moveTo(x, tableHeaderY).lineTo(x, tableHeaderY + tableHeight).stroke();
        });

        // Column Labels
        doc.font('Helvetica-Bold').fontSize(8);
        doc.text('CODE', cols[0], tableHeaderY + 4, { width: cols[1] - cols[0], align: 'center' });
        doc.text('LIBELLÉ', cols[1], tableHeaderY + 4, { width: cols[2] - cols[1], align: 'center' });
        doc.text('MONT.', cols[2], tableHeaderY + 4, { width: cols[3] - cols[2], align: 'center' });
        doc.text('NBR', cols[3], tableHeaderY + 4, { width: cols[4] - cols[3], align: 'center' });
        doc.text('SAL/PRIME', cols[4], tableHeaderY + 4, { width: cols[5] - cols[4], align: 'center' });
        doc.text('RETENUE', cols[5], tableHeaderY + 4, { width: cols[6] - cols[5], align: 'center' });

        // Table Content
        doc.font('Helvetica').fontSize(8);
        let rowY = tableHeaderY + 20;

        // Base Salary Row
        doc.text('SAL_B', cols[0] + 2, rowY);
        doc.text('SALAIRE DE BASE', cols[1] + 2, rowY);
        doc.text(dailyRate.toFixed(3), cols[2] + 2, rowY, { width: cols[3] - cols[2] - 4, align: 'right' });
        doc.text(workedDays.toString(), cols[3] + 2, rowY, { width: cols[4] - cols[3] - 4, align: 'center' });
        doc.text(basePayForWorkedDays.toFixed(3), cols[4] + 2, rowY, { width: cols[5] - cols[4] - 4, align: 'right' });

        // Prime Row
        if (primeAmount > 0) {
            rowY += 12;
            doc.text('PRIME', cols[0] + 2, rowY);
            doc.text('PRIMES ET INDEMNITÉS', cols[1] + 2, rowY);
            doc.text(primeAmount.toFixed(3), cols[4] + 2, rowY, { width: cols[5] - cols[4] - 4, align: 'right' });
        }

        // Advance Row
        if (avanceAmount > 0) {
            rowY += 12;
            const today = new Date().toLocaleDateString('fr-FR');
            let dateLabel = today;
            if (salary.date_avance) {
                const parts = salary.date_avance.split('-');
                if (parts.length === 3) {
                    dateLabel = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            }
            doc.text('AV_SAL', cols[0] + 2, rowY);
            doc.text(`AVANCE SUR SALAIRE ${dateLabel}`, cols[1] + 2, rowY);
            doc.text(avanceAmount.toFixed(3), cols[5] + 2, rowY, { width: cols[6] - cols[5] - 4, align: 'right' });
        }

        // BRUT Row
        rowY += 12;
        doc.font('Helvetica-Bold').text('BRUT', cols[0] + 2, rowY);
        doc.text('SALAIRE BRUT', cols[1] + 2, rowY);
        doc.text(netTotal.toFixed(3), cols[4] + 2, rowY, { width: cols[5] - cols[4] - 4, align: 'right' });

        // --- FOOTER SECTION ---
        currentY = tableHeaderY + tableHeight + 8;

        // Bottom Boxes
        doc.rect(20, currentY, 70, 45).stroke(); // Tot.B1 box
        doc.rect(90, currentY, 70, 45).stroke(); // T.R.IR box
        doc.rect(160, currentY, 150, 45).stroke(); // Payment info box

        doc.fontSize(6);
        doc.font('Helvetica').text('Tot.B1: 0.000', 25, currentY + 4);
        doc.text(`CG. pris mois : 0.000`, 25, currentY + 14);
        doc.text(`Absence : ${absenceDays}`, 25, currentY + 24);
        doc.text(`Nb.H/J Theo : ${totalWorkingDays}`, 25, currentY + 34);
        doc.text('T.R.IR:', 95, currentY + 4);
        doc.text('Mode paiement : Espèce', 165, currentY + 4);
        doc.text('Sur RIB :', 165, currentY + 14);

        // Signature
        doc.font('Helvetica').text('Signature :', 165, currentY + 32);

        // Net à payer
        const netBoxX = 320;
        const netBoxWidth = 80;
        doc.rect(netBoxX, currentY, netBoxWidth, 20).stroke();
        doc.font('Helvetica-Bold').fontSize(8).text('Net à payer', netBoxX, currentY + 4, { width: netBoxWidth, align: 'center' });

        doc.rect(netBoxX, currentY + 20, netBoxWidth, 25).stroke();
        doc.fontSize(10).text(netTotal.toFixed(3), netBoxX, currentY + 28, { width: netBoxWidth, align: 'center' });

        // Date
        doc.fontSize(7).text(new Date().toLocaleDateString('fr-FR'), cols[5], currentY + 50, { width: cols[6] - cols[5], align: 'right' });

        doc.end();
    } catch (error) {
        console.error('PDF Generation error:', error);
        res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
    }
});

// --- ATTESTATION DE TRAVAIL ---

app.post('/api/generate-work-certificate', async (req, res) => {
    try {
        const { employeeId, isCurrent, issuanceDate, ville, departement, dateFin, civilite } = req.body;
        const employee = await Employee.findByPk(employeeId);
        const company = await Company.findOne();

        if (!employee) {
            res.status(404).json({ error: 'Employé non trouvé' });
            return;
        }

        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=attestation-travail-${employee.code}.pdf`);

        doc.pipe(res);

        // --- HEADER ---
        let currentY = 50;

        // Logo (on the left)
        if (company?.logo_url) {
            try {
                if (company.logo_url.includes('/uploads/')) {
                    const filename = company.logo_url.split('/uploads/').pop();
                    const localPath = path.join(__dirname, '../uploads', filename!);
                    if (fs.existsSync(localPath)) {
                        doc.image(localPath, 50, currentY, { width: 80 });
                    }
                }
            } catch (e) {
                console.error('Logo loading error:', e);
            }
        }

        // Company Details (on the right)
        doc.font('Helvetica-Bold').fontSize(9); // Increased font size
        doc.text(`MF : ${company?.matricule_fiscal || ''}`, 420, currentY, { width: 130, align: 'left' });
        doc.text(`BANQUE : ${company?.banque || ''}`, 420, currentY + 18, { width: 130, align: 'left' }); // Increased spacing
        doc.text(`CCB : ${company?.ccb || ''}`, 420, currentY + 36, { width: 130, align: 'left' }); // Increased spacing

        // Horizontal Line (Full Width)
        doc.moveTo(0, currentY + 80).lineTo(595, currentY + 80).lineWidth(1).strokeColor('#1ab0e2').stroke();

        currentY = 180;

        // Title
        doc.font('Helvetica-Bold').fontSize(24).text('ATTESTATION DE TRAVAIL', 50, currentY, { align: 'center' });

        currentY += 120; // Large space between title and paragraph

        // Body
        doc.font('Helvetica').fontSize(13);

        const formatDateFr = (dateStr: string) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };

        const today = issuanceDate ? formatDateFr(issuanceDate) : new Date().toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const civ = civilite === 'Monsieur' ? 'Mr.' : 'Mme';
        const docType = employee.id_type || 'CIN';
        const docDate = employee.id_date ? formatDateFr(employee.id_date) : '(date)';
        const docPlace = employee.id_place || '(lieu)';

        doc.y = currentY; // Ensure spacing is applied
        doc.text(`Nous, `, { continued: true, lineGap: 5 });
        doc.font('Helvetica-Bold').text(company?.nom || '', { continued: true });
        doc.font('Helvetica').text(`, attestons par la présente que `, { continued: true });

        doc.font('Helvetica-Bold').fontSize(14).text(`${civ} ${employee.nom.toUpperCase()} ${employee.prenom}`, { continued: true });

        doc.font('Helvetica').fontSize(13).text(`, de nationalité `, { continued: true });
        doc.font('Helvetica-Bold').text(employee.nationalite || 'tunisienne', { continued: true });
        doc.font('Helvetica').text(`, titulaire du `, { continued: true });
        doc.font('Helvetica-Bold').text(docType, { continued: true });
        doc.font('Helvetica').text(` n° `, { continued: true });
        doc.font('Helvetica-Bold').text(employee.cin, { continued: true });
        doc.font('Helvetica').text(`, délivré le `, { continued: true });
        doc.font('Helvetica-Bold').text(docDate, { continued: true });
        doc.font('Helvetica').text(` à `, { continued: true });
        doc.font('Helvetica-Bold').text(docPlace + `, `, { continued: true });

        const hireDate = formatDateFr(employee.date_embauche);
        const missionEndDate = dateFin ? formatDateFr(dateFin) : today;

        if (isCurrent) {
            doc.text(`occupe actuellement le poste de `, { continued: true });
            doc.font('Helvetica-Bold').text(employee.poste, { continued: true });
            if (departement) {
                doc.font('Helvetica').text(` dans le département `, { continued: true });
                doc.font('Helvetica-Bold').text(departement, { continued: true });
            }
            doc.font('Helvetica').text(` au sein de notre entreprise depuis le `, { continued: true });
            doc.font('Helvetica-Bold').text(hireDate, { continued: false });
        } else {
            doc.text(`a effectué une mission au sein de notre entreprise en tant que `, { continued: true });
            doc.font('Helvetica-Bold').text(employee.poste, { continued: true });
            if (departement) {
                doc.font('Helvetica').text(` dans le département `, { continued: true });
                doc.font('Helvetica-Bold').text(departement, { continued: true });
            }
            doc.font('Helvetica').text(` du `, { continued: true });
            doc.font('Helvetica-Bold').text(hireDate, { continued: true });
            doc.font('Helvetica').text(` au `, { continued: true });
            doc.font('Helvetica-Bold').text(missionEndDate, { continued: false });
        }

        currentY += 120; // Increased space between content and "Nous délivrons..."

        doc.font('Helvetica').fontSize(13);
        doc.text(`Nous délivrons la présente attestation pour servir et valoir ce que de droit.`, 50, currentY, {
            align: 'justify',
            width: 500,
            lineGap: 5 // Added line spacing
        });

        currentY += 120; // Increased space before "Fait à..."

        // Footer Date and Signature
        doc.font('Helvetica').fontSize(12);
        doc.text(`Fait à ${ville || company?.ville || ''}, le ${today}`, 0, currentY, { align: 'right', width: 530 });

        currentY += 80; // Increased space before Cachet
        doc.font('Helvetica-Bold').text('Cachet & Signature', 0, currentY, { width: 530, align: 'right' });

        // --- STICKY FOOTER ---
        const footerY = 750; // Slightly higher to ensure it stays on page
        doc.moveTo(0, footerY - 10).lineTo(595, footerY - 10).lineWidth(1).strokeColor('#1ab0e2').stroke();
        doc.font('Helvetica-Bold').fontSize(9).text(`S.A.R.L Au capital de ${company?.capital || ''}`, 50, footerY, { align: 'center', width: 500 });
        doc.font('Helvetica').fontSize(8);
        doc.text(`Siège Social : ${company?.adresse || ''}, ${company?.ville || ''}`, 50, footerY + 12, { align: 'center', width: 500 });
        if (company?.telephone) {
            doc.text(`( Tél ) : ${company.telephone}`, 50, footerY + 24, { align: 'center', width: 500 });
        }

        doc.end();
    } catch (error) {
        console.error('Work certificate generation error:', error);
        res.status(500).json({ error: 'Erreur lors de la génération de l\'attestation' });
    }
});

app.post('/api/generate-internship-certificate', async (req, res) => {
    try {
        const { employeeId, dateDebut, dateFin, issuanceDate, ville, departement, civilite } = req.body;
        const employee = await Employee.findByPk(employeeId);
        const company = await Company.findOne();

        if (!employee) {
            res.status(404).json({ error: 'Stagiaire non trouvé' });
            return;
        }

        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=attestation-stage-${employee.code}.pdf`);

        doc.pipe(res);

        // --- HEADER ---
        let currentY = 50;

        // Logo (on the left)
        if (company?.logo_url) {
            try {
                if (company.logo_url.includes('/uploads/')) {
                    const filename = company.logo_url.split('/uploads/').pop();
                    const localPath = path.join(__dirname, '../uploads', filename!);
                    if (fs.existsSync(localPath)) {
                        doc.image(localPath, 50, currentY, { width: 80 });
                    }
                }
            } catch (e) {
                console.error('Logo loading error:', e);
            }
        }

        // Company Details (on the right)
        doc.font('Helvetica-Bold').fontSize(9); // Standardized to 9pt like work certificate
        doc.text(`MF : ${company?.matricule_fiscal || ''}`, 420, currentY, { width: 130, align: 'left' });
        doc.text(`BANQUE : ${company?.banque || ''}`, 420, currentY + 18, { width: 130, align: 'left' }); // Increased spacing
        doc.text(`CCB : ${company?.ccb || ''}`, 420, currentY + 36, { width: 130, align: 'left' }); // Increased spacing

        // Horizontal Line (Full Width)
        doc.moveTo(0, currentY + 80).lineTo(595, currentY + 80).lineWidth(1).strokeColor('#1ab0e2').stroke();

        currentY = 180;

        // Title
        doc.font('Helvetica-Bold').fontSize(24).text('ATTESTATION DE STAGE', 50, currentY, { align: 'center' });

        currentY += 120; // Large space between title and paragraph

        // Body
        doc.font('Helvetica').fontSize(13);

        const formatDateFr = (dateStr: string) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };

        const today = issuanceDate ? formatDateFr(issuanceDate) : new Date().toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const civ = civilite === 'Monsieur' ? 'Mr.' : 'Mme';
        const docType = employee.id_type || 'CIN';
        const docDate = employee.id_date ? formatDateFr(employee.id_date) : '(date)';
        const docPlace = employee.id_place || '(lieu)';

        doc.y = currentY; // Ensure spacing is applied
        doc.text(`Nous, `, { continued: true, lineGap: 5 });
        doc.font('Helvetica-Bold').text(company?.nom || '', { continued: true });
        doc.font('Helvetica').text(`, attestons par la présente que `, { continued: true });

        doc.font('Helvetica-Bold').fontSize(14).text(`${civ} ${employee.nom.toUpperCase()} ${employee.prenom}`, { continued: true });

        doc.font('Helvetica').fontSize(13).text(`, de nationalité `, { continued: true });
        doc.font('Helvetica-Bold').text(employee.nationalite || 'tunisienne', { continued: true });
        doc.font('Helvetica').text(`, titulaire du `, { continued: true });
        doc.font('Helvetica-Bold').text(docType, { continued: true });
        doc.font('Helvetica').text(` n° `, { continued: true });
        doc.font('Helvetica-Bold').text(employee.cin, { continued: true });
        doc.font('Helvetica').text(`, délivré le `, { continued: true });
        doc.font('Helvetica-Bold').text(docDate, { continued: true });
        doc.font('Helvetica').text(` à `, { continued: true });
        doc.font('Helvetica-Bold').text(docPlace, { continued: true });
        const start = dateDebut ? formatDateFr(dateDebut) : formatDateFr(employee.date_embauche);
        const end = dateFin ? formatDateFr(dateFin) : new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        doc.font('Helvetica').text(`, `, { continued: true });
        doc.font('Helvetica').text(`, a effectué un stage au sein de notre entreprise du `, { continued: true });
        doc.font('Helvetica-Bold').text(start, { continued: true });
        doc.font('Helvetica').text(` au `, { continued: true });
        doc.font('Helvetica-Bold').text(end, { continued: true });
        if (departement) {
            doc.font('Helvetica').text(`, dans le département `, { continued: true });
            doc.font('Helvetica-Bold').text(departement, { continued: false });
        } else {
            doc.text(`.`, { continued: false });
        }

        currentY += 120; // Standardized to 120pt space before "Nous délivrons..."

        doc.font('Helvetica').fontSize(13);
        doc.text(`Nous délivrons la présente attestation pour servir et valoir ce que de droit.`, 50, currentY, {
            align: 'justify',
            width: 500,
            lineGap: 5 // Added line spacing
        });

        currentY += 120; // Increased space before "Fait à..."

        // Footer Date and Signature
        doc.font('Helvetica').fontSize(12);
        doc.text(`Fait à ${ville || company?.ville || ''}, le ${today}`, 0, currentY, { align: 'right', width: 530 });

        currentY += 80; // Increased space before Cachet
        doc.font('Helvetica-Bold').text('Cachet & Signature', 0, currentY, { width: 530, align: 'right' });

        // --- STICKY FOOTER ---
        const footerY = 750; // Slightly higher to ensure it stays on page
        doc.moveTo(0, footerY - 10).lineTo(595, footerY - 10).lineWidth(1).strokeColor('#1ab0e2').stroke();
        doc.font('Helvetica-Bold').fontSize(9).text(`S.A.R.L Au capital de ${company?.capital || ''}`, 50, footerY, { align: 'center', width: 500 });
        doc.font('Helvetica').fontSize(8);
        doc.text(`Siège Social : ${company?.adresse || ''}, ${company?.ville || ''}`, 50, footerY + 12, { align: 'center', width: 500 });
        if (company?.telephone) {
            doc.text(`( Tél ) : ${company.telephone}`, 50, footerY + 24, { align: 'center', width: 500 });
        }

        doc.end();
    } catch (error) {
        console.error('Internship certificate generation error:', error);
        res.status(500).json({ error: 'Erreur lors de la génération de l\'attestation' });
    }
});

// Start Server
const startServer = async () => {
    try {
        await sequelize.sync({ alter: true }); // sans alter
        console.log('Database synced successfully');

        const server = app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });

        server.on('error', (e: any) => {
            if (e.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use. Please kill the other process or change PORT in .env`);
                process.exit(1);
            } else {
                console.error('Server error:', e);
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error);
    }
};

startServer();
