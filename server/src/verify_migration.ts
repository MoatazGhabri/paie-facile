import axios from 'axios';

const API_URL = 'http://31.97.177.87/api';

async function verify() {
    console.log('Verifying API Health...');
    try {
        const healthRes = await axios.get(`${API_URL}/health`);
        console.log('Health:', healthRes.data);

        if (healthRes.status !== 200) {
            console.error('Health check failed');
            return;
        }

        console.log('Verifying Employees Endpoint...');
        const employeesRes = await axios.get(`${API_URL}/employees`);
        if (employeesRes.status === 200) {
            const employees = employeesRes.data;
            console.log('Employees fetched successfully, count:', Array.isArray(employees) ? employees.length : 'Unknown');
        } else {
            console.error('Employees fetch failed:', employeesRes.statusText);
        }

        console.log('Verifying Company Endpoint...');
        const companyRes = await axios.get(`${API_URL}/company`);
        if (companyRes.status === 200) {
            const company = companyRes.data;
            console.log('Company fetched successfully:', company ? 'Found' : 'Null');
        } else {
            console.error('Company fetch failed:', companyRes.statusText);
        }

    } catch (error: any) {
        console.error('Verification failed:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    }
}

verify();
