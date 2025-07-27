// admin_dashboard.js

document.addEventListener('DOMContentLoaded', function() {
    M.AutoInit(); // Initialize Materialize components (modals, selects, datepickers, timepickers)

    const API_BASE_URL = window.location.origin; // Dynamically get base URL

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html'; // Redirect to login if no token
        return;
    }

    // --- Authentication and User Info ---
    async function getUserInfo() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/userinfo`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401 || response.status === 403) {
                alert('Session expired or unauthorized. Please log in again.');
                localStorage.clear();
                window.location.href = '/login.html';
                return null;
            }
            if (!response.ok) {
                throw new Error('Failed to fetch user info.');
            }
            const data = await response.json();
            document.getElementById('adminUsername').textContent = data.username;
            document.getElementById('headerUsername').textContent = data.username;
            return data;
        } catch (error) {
            console.error('Error fetching user info:', error);
            alert('Error loading user information.');
            return null;
        }
    }

    const userInfo = getUserInfo(); // Fetch user info on load


    // --- Sidebar and Section Switching ---
    const sidebarLinks = document.querySelectorAll('.sidebar nav ul li a');
    const sections = document.querySelectorAll('.dashboard-section');
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSectionId = this.dataset.section;

            // Remove 'active' from all links and sections
            sidebarLinks.forEach(l => l.parentElement.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active-section'));

            // Add 'active' to clicked link and corresponding section
            this.parentElement.classList.add('active');
            document.getElementById(targetSectionId).classList.add('active-section');

            // Close sidebar on mobile
            sidebar.classList.remove('active');

            // Specific actions for sections
            if (targetSectionId === 'all-trackings-section') {
                loadAllTrackings();
            } else if (targetSectionId === 'manage-tracking-section') {
                loadTrackingIdsForSelect();
                document.getElementById('updateTrackingForm').style.display = 'none'; // Hide form initially
                document.getElementById('addHistoryForm').style.display = 'none'; // Hide form initially
                document.getElementById('trackingHistoryList').querySelector('ul').innerHTML = ''; // Clear history
            } else if (targetSectionId === 'dashboard-section') {
                loadDashboardStats();
            } else if (targetSectionId === 'communication-center-section') {
                loadTrackingIdsForEmailAndFileUpload();
            } else if (targetSectionId === 'user-management-section') {
                loadUsers();
            }

            // Re-initialize Materialize components for newly visible elements
            M.updateTextFields(); // For labels
            M.Datepicker.init(document.querySelectorAll('.datepicker'));
            M.Timepicker.init(document.querySelectorAll('.timepicker'));
            M.FormSelect.init(document.querySelectorAll('select'));
        });
    });

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', function() {
        localStorage.clear(); // Clear all stored data (token, user info)
        window.location.href = '/login.html'; // Redirect to login page
    });

    // --- Utility Functions ---
    function displayMessage(message, type = 'success') {
        M.toast({html: message, classes: type === 'success' ? 'green' : 'red'});
    }

    function getStatusCircleClass(status) {
        status = status.toLowerCase();
        if (status.includes('delivered')) return 'delivered';
        if (status.includes('in transit')) return 'in-transit';
        if (status.includes('pending')) return 'pending';
        if (status.includes('exception')) return 'exception';
        return 'unknown';
    }

    // --- Dashboard Overview (Load Stats) ---
    async function loadDashboardStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/trackings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch tracking data for dashboard stats.');
            }
            const trackings = await response.json();

            document.getElementById('totalPackages').textContent = trackings.length;
            document.getElementById('deliveredPackages').textContent = trackings.filter(t => t.status.toLowerCase().includes('delivered')).length;
            document.getElementById('inTransitPackages').textContent = trackings.filter(t => t.status.toLowerCase().includes('in transit')).length;
            document.getElementById('pendingPackages').textContent = trackings.filter(t => t.status.toLowerCase().includes('pending')).length;
            document.getElementById('exceptionsPackages').textContent = trackings.filter(t => t.status.toLowerCase().includes('exception')).length;
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            displayMessage('Error loading dashboard stats.', 'error');
        }
    }

    // --- Add New Tracking Section ---
    const addTrackingForm = document.getElementById('addTrackingForm');
    const addStatusInput = document.getElementById('addStatus');
    const addStatusCircle = document.getElementById('addStatusCircle');
    const addIsBlinkingCheckbox = document.getElementById('addIsBlinking');

    // Update status circle color on status input change
    addStatusInput.addEventListener('input', function() {
        const status = this.value;
        addStatusCircle.className = `status-circle ${getStatusCircleClass(status)}`;
    });

    addTrackingForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const newTrackingData = {
            trackingId: document.getElementById('addTrackingId').value,
            status: addStatusInput.value,
            isBlinking: addIsBlinkingCheckbox.checked,
            statusLineColor: document.getElementById('addStatusLineColor').value,
            blinkingDotColor: document.getElementById('addBlinkingDotColor').value,
            senderName: document.getElementById('addSenderName').value,
            recipientName: document.getElementById('addRecipientName').value,
            recipientEmail: document.getElementById('addRecipientEmail').value,
            packageContents: document.getElementById('addPackageContents').value,
            serviceType: document.getElementById('addServiceType').value,
            recipientAddress: document.getElementById('addRecipientAddress').value,
            specialHandling: document.getElementById('addSpecialHandling').value,
            expectedDeliveryDate: document.getElementById('addExpectedDeliveryDate').value,
            expectedDeliveryTime: document.getElementById('addExpectedDeliveryTime').value,
            origin: document.getElementById('addOrigin').value,
            destination: document.getElementById('addDestination').value,
            weight: parseFloat(document.getElementById('addWeight').value) || 0
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/trackings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newTrackingData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add new tracking.');
            }

            const result = await response.json();
            displayMessage(`Tracking ${result.trackingId} added successfully!`);
            addTrackingForm.reset();
            // Re-initialize Materialize inputs after reset to fix labels
            M.updateTextFields();
            // Reset status circle
            addStatusCircle.className = 'status-circle';

        } catch (error) {
            console.error('Error adding tracking:', error);
            displayMessage(`Error: ${error.message}`, 'error');
        }
    });

    // --- Manage Single Tracking Section ---
    const singleTrackingIdSelect = document.getElementById('singleTrackingIdSelect');
    const updateTrackingForm = document.getElementById('updateTrackingForm');
    const updateStatusInput = document.getElementById('updateStatus');
    const updateStatusCircle = document.getElementById('updateStatusCircle');
    const updateIsBlinkingCheckbox = document.getElementById('updateIsBlinkingOriginal'); // Corrected ID

    let currentTrackingMongoId = null; // Store the MongoDB _id of the currently loaded tracking

    // Update status circle color on status input change for update form
    updateStatusInput.addEventListener('input', function() {
        const status = this.value;
        updateStatusCircle.className = `status-circle ${getStatusCircleClass(status)}`;
    });
    updateIsBlinkingCheckbox.addEventListener('change', function() {
        if (this.checked) {
            updateStatusCircle.classList.add('blinking');
        } else {
            updateStatusCircle.classList.remove('blinking');
        }
    });


    async function loadTrackingIdsForSelect() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/trackings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch tracking IDs.');
            }
            const trackings = await response.json();

            singleTrackingIdSelect.innerHTML = '<option value="" disabled selected>Select Tracking ID</option>';
            trackings.forEach(tracking => {
                const option = document.createElement('option');
                option.value = tracking._id; // Use MongoDB _id for internal management
                option.textContent = tracking.trackingId; // Display trackingId to user
                singleTrackingIdSelect.appendChild(option);
            });
            M.FormSelect.init(singleTrackingIdSelect); // Re-initialize Materialize select
        } catch (error) {
            console.error('Error loading tracking IDs:', error);
            displayMessage('Error loading tracking IDs for selection.', 'error');
        }
    }

    singleTrackingIdSelect.addEventListener('change', async function() {
        currentTrackingMongoId = this.value; // Get the MongoDB _id
        if (!currentTrackingMongoId) {
            updateTrackingForm.style.display = 'none';
            document.getElementById('trackingHistoryList').querySelector('ul').innerHTML = '';
            document.getElementById('addHistoryForm').style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/trackings/${currentTrackingMongoId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch tracking details.');
            }
            const tracking = await response.json();

            // Populate form fields
            document.getElementById('updateTrackingId').value = tracking.trackingId;
            updateStatusInput.value = tracking.status;
            updateIsBlinkingCheckbox.checked = tracking.isBlinking;
            document.getElementById('updateStatusLineColor').value = tracking.statusLineColor || '#2196F3';
            document.getElementById('updateBlinkingDotColor').value = tracking.blinkingDotColor || '#FFFFFF';
            document.getElementById('updateSenderName').value = tracking.senderName;
            document.getElementById('updateRecipientName').value = tracking.recipientName;
            document.getElementById('updateRecipientEmail').value = tracking.recipientEmail;
            document.getElementById('updatePackageContents').value = tracking.packageContents;
            document.getElementById('updateServiceType').value = tracking.serviceType;
            document.getElementById('updateRecipientAddress').value = tracking.recipientAddress;
            document.getElementById('updateSpecialHandling').value = tracking.specialHandling;
            document.getElementById('updateExpectedDeliveryDate').value = tracking.expectedDeliveryDate;
            document.getElementById('updateExpectedDeliveryTime').value = tracking.expectedDeliveryTime;
            document.getElementById('updateOrigin').value = tracking.origin;
            document.getElementById('updateDestination').value = tracking.destination;
            document.getElementById('updateWeight').value = tracking.weight;

            // Update status circle
            updateStatusCircle.className = `status-circle ${getStatusCircleClass(tracking.status)}`;
            if (tracking.isBlinking) {
                updateStatusCircle.classList.add('blinking');
            } else {
                updateStatusCircle.classList.remove('blinking');
            }


            M.updateTextFields(); // Re-activate Materialize labels
            // Re-initialize date/time pickers to show current values
            M.Datepicker.init(document.getElementById('updateExpectedDeliveryDate')).setDate(new Date(tracking.expectedDeliveryDate));
            M.Timepicker.init(document.getElementById('updateExpectedDeliveryTime')).setDate(new Date('1970/01/01 ' + tracking.expectedDeliveryTime));

            updateTrackingForm.style.display = 'block';
            document.getElementById('addHistoryForm').style.display = 'block';
            loadTrackingHistory(currentTrackingMongoId);

        } catch (error) {
            console.error('Error fetching tracking details:', error);
            displayMessage(`Error: ${error.message}`, 'error');
            updateTrackingForm.style.display = 'none';
            document.getElementById('addHistoryForm').style.display = 'none';
        }
    });

    updateTrackingForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const updatedData = {
            status: document.getElementById('updateStatus').value,
            isBlinking: document.getElementById('updateIsBlinkingOriginal').checked,
            statusLineColor: document.getElementById('updateStatusLineColor').value,
            blinkingDotColor: document.getElementById('updateBlinkingDotColor').value,
            senderName: document.getElementById('updateSenderName').value,
            recipientName: document.getElementById('updateRecipientName').value,
            recipientEmail: document.getElementById('updateRecipientEmail').value,
            packageContents: document.getElementById('updatePackageContents').value,
            serviceType: document.getElementById('updateServiceType').value,
            recipientAddress: document.getElementById('updateRecipientAddress').value,
            specialHandling: document.getElementById('updateSpecialHandling').value,
            expectedDeliveryDate: document.getElementById('updateExpectedDeliveryDate').value,
            expectedDeliveryTime: document.getElementById('updateExpectedDeliveryTime').value,
            origin: document.getElementById('updateOrigin').value,
            destination: document.getElementById('updateDestination').value,
            weight: parseFloat(document.getElementById('updateWeight').value) || 0
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/trackings/${currentTrackingMongoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update tracking.');
            }

            displayMessage('Tracking updated successfully!');
            loadDashboardStats(); // Update dashboard stats after modification
            loadAllTrackings(); // Refresh all trackings table
        } catch (error) {
            console.error('Error updating tracking:', error);
            displayMessage(`Error: ${error.message}`, 'error');
        }
    });

    // --- Tracking History Management ---
    const trackingHistoryList = document.getElementById('trackingHistoryList').querySelector('ul');
    const addHistoryForm = document.getElementById('addHistoryForm');
    const editHistoryModal = document.getElementById('editHistoryModal');
    const saveHistoryEditBtn = document.getElementById('saveHistoryEditBtn');

    let editHistoryModalInstance = null; // To store the Materialize modal instance

    // Initialize the edit history modal
    M.onOpenEnd = function(modal) {
        if (modal.id === 'editHistoryModal') {
            M.Datepicker.init(document.getElementById('editHistoryDate'));
            M.Timepicker.init(document.getElementById('editHistoryTime'));
            M.updateTextFields(); // For labels
        }
    };


    async function loadTrackingHistory(mongoId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/trackings/${mongoId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch tracking history.');
            }
            const tracking = await response.json();
            const history = tracking.trackingHistory.sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));

            trackingHistoryList.innerHTML = ''; // Clear existing history
            if (history.length === 0) {
                trackingHistoryList.innerHTML = '<li class="collection-item">No history events found for this tracking.</li>';
                return;
            }

            history.forEach(event => {
                const li = document.createElement('li');
                li.className = 'collection-item';
                li.innerHTML = `
                    <div class="history-content">
                        <strong>Date:</strong> ${event.date}<br>
                        <strong>Time:</strong> ${event.time}<br>
                        <strong>Location:</strong> ${event.location || 'N/A'}<br>
                        <strong>Description:</strong> ${event.description}
                    </div>
                    <div class="history-actions">
                        <button class="btn-small waves-effect waves-light blue edit-history-btn" data-history-id="${event._id}">
                            <i class="material-icons">edit</i>
                        </button>
                        <button class="btn-small waves-effect waves-light red delete-history-btn" data-history-id="${event._id}">
                            <i class="material-icons">delete</i>
                        </button>
                    </div>
                `;
                trackingHistoryList.appendChild(li);
            });
            attachHistoryEventHandlers();
        } catch (error) {
            console.error('Error loading tracking history:', error);
            displayMessage('Error loading tracking history.', 'error');
        }
    }

    function attachHistoryEventHandlers() {
        document.querySelectorAll('.edit-history-btn').forEach(button => {
            button.onclick = (e) => openEditHistoryModal(e.currentTarget.dataset.historyId);
        });
        document.querySelectorAll('.delete-history-btn').forEach(button => {
            button.onclick = (e) => deleteHistoryEvent(e.currentTarget.dataset.historyId);
        });
    }

    addHistoryForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!currentTrackingMongoId) {
            displayMessage('Please select a tracking to add history to.', 'error');
            return;
        }

        const newHistoryEvent = {
            date: document.getElementById('newHistoryDate').value,
            time: document.getElementById('newHistoryTime').value,
            location: document.getElementById('newHistoryLocation').value,
            description: document.getElementById('newHistoryDescription').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/trackings/${currentTrackingMongoId}/history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newHistoryEvent)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add history event.');
            }

            displayMessage('History event added successfully!');
            addHistoryForm.reset();
            M.updateTextFields(); // Reset labels
            loadTrackingHistory(currentTrackingMongoId); // Reload history
        } catch (error) {
            console.error('Error adding history event:', error);
            displayMessage(`Error: ${error.message}`, 'error');
        }
    });

    async function openEditHistoryModal(historyId) {
        if (!currentTrackingMongoId) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/trackings/${currentTrackingMongoId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch tracking details for history edit.');
            const tracking = await response.json();
            const historyItem = tracking.trackingHistory.find(item => item._id === historyId);

            if (!historyItem) {
                displayMessage('History event not found.', 'error');
                return;
            }

            document.getElementById('editHistoryModalTrackingMongoId').value = currentTrackingMongoId;
            document.getElementById('editHistoryModalHistoryId').value = historyId;
            document.getElementById('editHistoryDate').value = historyItem.date;
            document.getElementById('editHistoryTime').value = historyItem.time;
            document.getElementById('editHistoryLocation').value = historyItem.location;
            document.getElementById('editHistoryDescription').value = historyItem.description;

            M.updateTextFields(); // Re-activate Materialize labels for the modal fields
            M.Datepicker.getInstance(document.getElementById('editHistoryDate')).setDate(new Date(historyItem.date));
            M.Timepicker.getInstance(document.getElementById('editHistoryTime')).setDate(new Date('1970/01/01 ' + historyItem.time));


            if (!editHistoryModalInstance) {
                editHistoryModalInstance = M.Modal.init(editHistoryModal);
            }
            editHistoryModalInstance.open();

        } catch (error) {
            console.error('Error opening edit history modal:', error);
            displayMessage(`Error: ${error.message}`, 'error');
        }
    }

    saveHistoryEditBtn.addEventListener('click', async function() {
        const trackingId = document.getElementById('editHistoryModalTrackingMongoId').value;
        const historyId = document.getElementById('editHistoryModalHistoryId').value;

        const updatedHistoryData = {
            date: document.getElementById('editHistoryDate').value,
            time: document.getElementById('editHistoryTime').value,
            location: document.getElementById('editHistoryLocation').value,
            description: document.getElementById('editHistoryDescription').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/trackings/${trackingId}/history/${historyId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedHistoryData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update history event.');
            }

            displayMessage('History event updated successfully!');
            loadTrackingHistory(trackingId); // Reload history
            editHistoryModalInstance.close();
        } catch (error) {
            console.error('Error updating history event:', error);
            displayMessage(`Error: ${error.message}`, 'error');
        }
    });

    async function deleteHistoryEvent(historyId) {
        if (!currentTrackingMongoId || !confirm('Are you sure you want to delete this history event?')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/trackings/${currentTrackingMongoId}/history/${historyId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete history event.');
            }

            displayMessage('History event deleted successfully!');
            loadTrackingHistory(currentTrackingMongoId); // Reload history
        } catch (error) {
            console.error('Error deleting history event:', error);
            displayMessage(`Error: ${error.message}`, 'error');
        }
    }

    // --- Manage All Trackings Section ---
    const allTrackingsTableBody = document.getElementById('all-trackings-table-body');

    async function loadAllTrackings() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/trackings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch all trackings.');
            }
            const trackings = await response.json();

            allTrackingsTableBody.innerHTML = ''; // Clear existing rows
            if (trackings.length === 0) {
                allTrackingsTableBody.innerHTML = '<tr><td colspan="14" style="text-align: center; padding: 20px;">No tracking data available.</td></tr>';
                return;
            }

            trackings.forEach(tracking => {
                const row = document.createElement('tr');
                const lastUpdatedDate = new Date(tracking.lastUpdated).toLocaleString();
                const expectedDelivery = `${tracking.expectedDeliveryDate || 'N/A'} ${tracking.expectedDeliveryTime || ''}`.trim();

                const statusCircleHtml = `<div class="status-circle ${getStatusCircleClass(tracking.status)} ${tracking.isBlinking ? 'blinking' : ''}"></div>`;
                const statusColorCircle = `<div style="width: 20px; height: 20px; border-radius: 50%; background-color: ${tracking.statusLineColor || '#2196F3'}; border: 1px solid #ccc; display: inline-block; vertical-align: middle;"></div>`;
                const blinkingDotColorCircle = `<div style="width: 20px; height: 20px; border-radius: 50%; background-color: ${tracking.blinkingDotColor || '#FFFFFF'}; border: 1px solid #ccc; display: inline-block; vertical-align: middle;"></div>`;


                row.innerHTML = `
                    <td>${tracking.trackingId}</td>
                    <td>${statusCircleHtml} ${tracking.status}</td>
                    <td>${statusColorCircle} ${tracking.statusLineColor || 'Default Blue'}</td>
                    <td>${tracking.isBlinking ? 'Yes' : 'No'}</td>
                    <td>${tracking.senderName}</td>
                    <td>${tracking.recipientName}</td>
                    <td>${tracking.recipientEmail}</td>
                    <td>${tracking.packageContents}</td>
                    <td>${tracking.serviceType}</td>
                    <td>${tracking.recipientAddress}</td>
                    <td>${tracking.specialHandling || 'N/A'}</td>
                    <td>${expectedDelivery}</td>
                    <td>${lastUpdatedDate}</td>
                    <td>
                        <button class="btn-small waves-effect waves-light blue darken-2 view-edit-tracking-btn" data-id="${tracking._id}" data-tracking-id="${tracking.trackingId}">View/Edit</button>
                        <button class="btn-small waves-effect waves-light red darken-2 delete-tracking-btn" data-id="${tracking._id}" data-tracking-id="${tracking.trackingId}">Delete</button>
                    </td>
                `;
                allTrackingsTableBody.appendChild(row);
            });

            attachAllTrackingsEventHandlers();
        } catch (error) {
            console.error('Error loading all trackings:', error);
            displayMessage('Error loading all trackings.', 'error');
        }
    }

    function attachAllTrackingsEventHandlers() {
        document.querySelectorAll('.view-edit-tracking-btn').forEach(button => {
            button.addEventListener('click', function() {
                const mongoId = this.dataset.id;
                // Switch to manage single tracking section and load the tracking
                document.querySelector('.sidebar nav ul li a[data-section="manage-tracking-section"]').parentElement.classList.add('active');
                document.getElementById('manage-tracking-section').classList.add('active-section');

                // Simulate selection in the dropdown to trigger its change event
                const selectElement = document.getElementById('singleTrackingIdSelect');
                selectElement.value = mongoId;
                M.FormSelect.getInstance(selectElement).input.value = this.dataset.trackingId; // Update visible text
                selectElement.dispatchEvent(new Event('change')); // Manually trigger change
            });
        });

        document.querySelectorAll('.delete-tracking-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const mongoId = this.dataset.id;
                const trackingId = this.dataset.trackingId;
                if (confirm(`Are you sure you want to delete tracking ID: ${trackingId}? This action cannot be undone.`)) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/api/admin/trackings/${mongoId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.message || 'Failed to delete tracking.');
                        }
                        displayMessage(`Tracking ${trackingId} deleted successfully!`);
                        loadAllTrackings(); // Reload table
                        loadDashboardStats(); // Update dashboard stats
                        loadTrackingIdsForSelect(); // Update dropdowns
                        loadTrackingIdsForEmailAndFileUpload(); // Update email/file dropdowns
                    } catch (error) {
                        console.error('Error deleting tracking:', error);
                        displayMessage(`Error: ${error.message}`, 'error');
                    }
                }
            });
        });
    }

    // --- Communication Center ---
    const emailTrackingIdSelect = document.getElementById('emailTrackingIdSelect');
    const attachFileTrackingIdSelect = document.getElementById('attachFileTrackingIdSelect');
    const sendEmailForm = document.getElementById('sendEmailForm');
    const uploadPackageFileForm = document.getElementById('uploadPackageFileForm');


    async function loadTrackingIdsForEmailAndFileUpload() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/trackings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch tracking IDs for email/upload.');
            }
            const trackings = await response.json();

            // Clear and populate email tracking ID select
            emailTrackingIdSelect.innerHTML = '<option value="" disabled selected>Select Tracking ID (Optional, for pre-filling email)</option>';
            trackings.forEach(tracking => {
                const option = document.createElement('option');
                option.value = tracking.trackingId; // Use actual tracking ID for email link
                option.textContent = tracking.trackingId;
                emailTrackingIdSelect.appendChild(option);
            });
            M.FormSelect.init(emailTrackingIdSelect);

            // Clear and populate attach file tracking ID select
            attachFileTrackingIdSelect.innerHTML = '<option value="" disabled selected>Select Tracking ID</option>';
            trackings.forEach(tracking => {
                const option = document.createElement('option');
                option.value = tracking._id; // Use MongoDB _id for file attachment
                option.textContent = tracking.trackingId;
                attachFileTrackingIdSelect.appendChild(option);
            });
            M.FormSelect.init(attachFileTrackingIdSelect);

        } catch (error) {
            console.error('Error loading tracking IDs for email/upload:', error);
            displayMessage('Error loading tracking IDs for communication.', 'error');
        }
    }

    // Populate email recipient based on selected tracking ID
    emailTrackingIdSelect.addEventListener('change', async function() {
        const selectedTrackingId = this.value; // This is the actual trackingId string
        if (selectedTrackingId) {
            try {
                // Fetch the tracking by its custom trackingId
                const response = await fetch(`${API_BASE_URL}/api/track/${selectedTrackingId}`);
                if (!response.ok) throw new Error('Failed to fetch tracking details for email prepopulation.');
                const tracking = await response.json();
                document.getElementById('notificationEmail').value = tracking.recipientEmail;
                M.updateTextFields(); // Update label state
            } catch (error) {
                console.error('Error pre-populating email:', error);
                displayMessage('Could not pre-populate recipient email.', 'warning');
                document.getElementById('notificationEmail').value = '';
                M.updateTextFields();
            }
        } else {
            document.getElementById('notificationEmail').value = '';
            M.updateTextFields();
        }
    });


    sendEmailForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData();
        formData.append('notificationEmail', document.getElementById('notificationEmail').value);
        formData.append('emailSubject', document.getElementById('emailSubject').value);
        formData.append('notificationMessage', document.getElementById('notificationMessage').value);
        const emailTrackingId = document.getElementById('emailTrackingIdSelect').value;
        if (emailTrackingId) {
            formData.append('emailTrackingId', emailTrackingId); // Append the actual trackingId for the link
        }
        const attachmentFile = document.getElementById('emailAttachmentFileUpload').files[0];
        if (attachmentFile) {
            formData.append('emailAttachmentFile', attachmentFile);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/send-email`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData // No Content-Type header needed for FormData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send email.');
            }

            displayMessage('Email sent successfully!');
            sendEmailForm.reset();
            M.updateTextFields(); // Reset labels
        } catch (error) {
            console.error('Error sending email:', error);
            displayMessage(`Error sending email: ${error.message}`, 'error');
        }
    });

    uploadPackageFileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const trackingMongoId = document.getElementById('attachFileTrackingIdSelect').value;
        const packageFile = document.getElementById('packageFileInput').files[0];

        if (!trackingMongoId) {
            displayMessage('Please select a tracking ID to link the file to.', 'error');
            return;
        }
        if (!packageFile) {
            displayMessage('Please select a file to upload.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('packageFile', packageFile);

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/trackings/${trackingMongoId}/files`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to upload package file.');
            }

            displayMessage('Package file uploaded and linked successfully!');
            uploadPackageFileForm.reset();
            M.updateTextFields(); // Reset labels
        } catch (error) {
            console.error('Error uploading package file:', error);
            displayMessage(`Error uploading file: ${error.message}`, 'error');
        }
    });


    // --- User Management Section ---
    const usersTableBody = document.getElementById('users-table-body');
    const createUserForm = document.getElementById('createUserForm');
    const editUserForm = document.getElementById('editUserForm');
    const deleteUserBtn = document.getElementById('deleteUserBtn');
    let deleteUserModalInstance = null; // To store the Materialize modal instance

    // Initialize Materialize modals for user management
    const createUserModal = document.getElementById('createUserModal');
    M.Modal.init(createUserModal);
    const editUserModal = document.getElementById('editUserModal');
    M.Modal.init(editUserModal);
    const deleteUserModal = document.getElementById('deleteUserModal');
    deleteUserModalInstance = M.Modal.init(deleteUserModal); // Store instance

    async function loadUsers() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('You do not have permission to view users.');
                }
                throw new Error('Failed to fetch users.');
            }
            const users = await response.json();

            usersTableBody.innerHTML = ''; // Clear existing rows
            if (users.length === 0) {
                usersTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No users found.</td></tr>';
                return;
            }

            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td>
                        <button class="btn-small waves-effect waves-light blue edit-user-btn" data-id="${user._id}">
                            <i class="material-icons">edit</i>
                        </button>
                        <button class="btn-small waves-effect waves-light red delete-user-btn" data-id="${user._id}" data-username="${user.username}">
                            <i class="material-icons">delete</i>
                        </button>
                    </td>
                `;
                usersTableBody.appendChild(row);
            });
            attachUserEventHandlers();
        } catch (error) {
            console.error('Error loading users:', error);
            displayMessage(`Error: ${error.message}`, 'error');
            usersTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: red;">${error.message}</td></tr>`;
        }
    }

    function attachUserEventHandlers() {
        document.querySelectorAll('.edit-user-btn').forEach(button => {
            button.onclick = (e) => openEditUserModal(e.currentTarget.dataset.id);
        });
        document.querySelectorAll('.delete-user-btn').forEach(button => {
            button.onclick = (e) => openDeleteUserModal(e.currentTarget.dataset.id, e.currentTarget.dataset.username);
        });
    }

    createUserForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const newUser = {
            username: document.getElementById('newUsername').value,
            email: document.getElementById('newEmail').value,
            password: document.getElementById('newPassword').value,
            role: document.getElementById('newUserRole').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newUser)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create user.');
            }

            displayMessage('User created successfully!');
            createUserForm.reset();
            M.Modal.getInstance(createUserModal).close();
            loadUsers(); // Reload users table
        } catch (error) {
            console.error('Error creating user:', error);
            displayMessage(`Error: ${error.message}`, 'error');
        }
    });

    async function openEditUserModal(userId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch user data for edit.');
            }
            const user = await response.json();

            document.getElementById('editUserId').value = user._id;
            document.getElementById('editUsername').value = user.username;
            document.getElementById('editEmail').value = user.email;
            document.getElementById('editPassword').value = ''; // Clear password field for security
            document.getElementById('editUserRole').value = user.role;

            M.updateTextFields(); // For labels
            M.FormSelect.getInstance(document.getElementById('editUserRole')).destroy(); // Destroy and re-init to update select
            M.FormSelect.init(document.getElementById('editUserRole'));


            M.Modal.getInstance(editUserModal).open();
        } catch (error) {
            console.error('Error opening edit user modal:', error);
            displayMessage(`Error: ${error.message}`, 'error');
        }
    }

    editUserForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const userId = document.getElementById('editUserId').value;
        const updatedUser = {
            username: document.getElementById('editUsername').value,
            email: document.getElementById('editEmail').value,
            role: document.getElementById('editUserRole').value
        };
        const newPassword = document.getElementById('editPassword').value;
        if (newPassword) {
            updatedUser.password = newPassword;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedUser)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update user.');
            }

            displayMessage('User updated successfully!');
            M.Modal.getInstance(editUserModal).close();
            loadUsers(); // Reload users table
        } catch (error) {
            console.error('Error updating user:', error);
            displayMessage(`Error: ${error.message}`, 'error');
        }
    });

    function openDeleteUserModal(userId, username) {
        document.getElementById('usernameToDelete').textContent = username;
        document.getElementById('userIdToDeleteInput').value = userId;
        deleteUserModalInstance.open();
    }

    deleteUserBtn.addEventListener('click', async function() {
        const userId = document.getElementById('userIdToDeleteInput').value;
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete user.');
            }

            displayMessage('User deleted successfully!');
            deleteUserModalInstance.close();
            loadUsers(); // Reload users table
        } catch (error) {
            console.error('Error deleting user:', error);
            displayMessage(`Error: ${error.message}`, 'error');
        }
    });


    // --- Initial Load (Dashboard and User Info) ---
    getUserInfo().then(user => {
        if (user) {
            loadDashboardStats(); // Load stats only if user is logged in
            // Optionally, restrict sections based on role
            if (user.role === 'viewer') {
                document.querySelector('[data-section="add-tracking-section"]').parentElement.style.display = 'none';
                document.querySelector('[data-section="manage-tracking-section"]').parentElement.style.display = 'none';
                document.querySelector('[data-section="user-management-section"]').parentElement.style.display = 'none';
                document.querySelector('[data-section="communication-center-section"]').parentElement.style.display = 'none';
            }
        }
    });
});
