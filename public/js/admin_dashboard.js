document.addEventListener('DOMContentLoaded', function() {
    // Initialize Materialize components
    M.AutoInit();

    // Get DOM elements for various forms and sections
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    const sections = document.querySelectorAll('.dashboard-section');
    const sidebarLinks = document.querySelectorAll('.sidebar nav ul li a');

    // Dashboard Quick Stats Elements
    const totalPackages = document.getElementById('totalPackages');
    const deliveredPackages = document.getElementById('deliveredPackages');
    const inTransitPackages = document.getElementById('inTransitPackages');
    const pendingPackages = document.getElementById('pendingPackages');
    const exceptionsPackages = document.getElementById('exceptionsPackages');

    // Add Tracking Form Elements
    const addTrackingForm = document.getElementById('addTrackingForm');
    const addStatusInput = document.getElementById('addStatus');
    const addStatusCircle = document.getElementById('addStatusCircle');
    const addIsBlinkingCheckbox = document.getElementById('addIsBlinking');

    // Update Tracking Form Elements
    const singleTrackingIdSelect = document.getElementById('singleTrackingIdSelect');
    const updateTrackingForm = document.getElementById('updateTrackingForm');
    const updateTrackingMongoId = document.getElementById('updateTrackingMongoId');
    const updateTrackingId = document.getElementById('updateTrackingId');
    const updateStatusInput = document.getElementById('updateStatus');
    const updateStatusCircle = document.getElementById('updateStatusCircle');
    const updateIsBlinkingOriginal = document.getElementById('updateIsBlinkingOriginal'); // Corrected ID

    // Tracking History Elements
    const trackingHistoryList = document.getElementById('trackingHistoryList');
    const addHistoryForm = document.getElementById('addHistoryForm');
    const editHistoryModal = document.getElementById('editHistoryModal');
    const editHistoryModalTrackingMongoId = document.getElementById('editHistoryModalTrackingMongoId');
    const editHistoryModalHistoryId = document.getElementById('editHistoryModalHistoryId');
    const editHistoryDate = document.getElementById('editHistoryDate');
    const editHistoryTime = document.getElementById('editHistoryTime');
    const editHistoryLocation = document.getElementById('editHistoryLocation');
    const editHistoryDescription = document.getElementById('editHistoryDescription');
    const saveHistoryEditBtn = document.getElementById('saveHistoryEditBtn');

    // All Trackings Table Body
    const allTrackingsTableBody = document.getElementById('all-trackings-table-body');

    // Communication Center Elements
    const emailTrackingIdSelect = document.getElementById('emailTrackingIdSelect');
    const notificationEmail = document.getElementById('notificationEmail'); // Corrected ID
    const emailSubject = document.getElementById('emailSubject'); // Corrected ID
    const notificationMessage = document.getElementById('notificationMessage'); // Corrected ID
    const emailAttachmentFileUpload = document.getElementById('emailAttachmentFileUpload');
    const sendEmailForm = document.getElementById('sendEmailForm'); // Make sure this exists

    const attachFileTrackingIdSelect = document.getElementById('attachFileTrackingIdSelect');
    const packageFileInput = document.getElementById('packageFileInput');
    const uploadPackageFileForm = document.getElementById('uploadPackageFileForm');

    // User Management Elements
    const createUserModal = document.getElementById('createUserModal');
    const createUserForm = document.getElementById('createUserForm');
    const editUserModal = document.getElementById('editUserModal');
    const editUserForm = document.getElementById('editUserForm');
    const deleteUserModalTrigger = document.getElementById('deleteUserModal'); // The modal itself
    const deleteUserBtn = document.getElementById('deleteUserBtn');
    const userIdToDeleteInput = document.getElementById('userIdToDeleteInput');
    const usersTableBody = document.getElementById('users-table-body');
    const usernameToDelete = document.getElementById('usernameToDelete'); // To display username in delete modal

    // Header and Sidebar Username
    const adminUsername = document.getElementById('adminUsername');
    const headerUsername = document.getElementById('headerUsername');

    // Logout Button
    const logoutBtn = document.getElementById('logout-btn');


    // --- Authentication and Token Handling ---
    function checkAuth() {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username'); // Assuming you store username on login
        if (!token) {
            window.location.href = 'admin_login.html';
        } else {
            // Display username if logged in
            if (adminUsername) adminUsername.textContent = username || 'Admin';
            if (headerUsername) headerUsername.textContent = username || 'Admin';
        }
    }

    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('token');
        localStorage.removeItem('username'); // Clear username on logout
        M.toast({html: 'Logged out successfully!', classes: 'green darken-2'});
        setTimeout(() => window.location.href = 'admin_login.html', 1500);
    });

    // Run auth check on page load
    checkAuth();


    // --- UI Navigation Logic ---
    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.remove('active-section');
            section.style.display = 'none'; // Hide all sections
        });
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
            activeSection.classList.add('active-section');
            activeSection.style.display = 'block'; // Show the active section
        }

        sidebarLinks.forEach(link => {
            link.parentElement.classList.remove('active');
            if (link.dataset.section === sectionId) {
                link.parentElement.classList.add('active');
            }
        });
        // Close sidebar on mobile after selection
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    }

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.dataset.section;
            showSection(sectionId);

            // Fetch data specific to the section when navigating
            if (sectionId === 'all-trackings-section') {
                fetchAllTrackings();
            } else if (sectionId === 'manage-tracking-section') {
                fetchTrackingIdsForSelect(); // For the single tracking update dropdown
            } else if (sectionId === 'communication-center-section') {
                fetchTrackingIdsForEmailSelect(); // For email pre-fill
                fetchTrackingIdsForAttachFileSelect(); // For file attachment
            } else if (sectionId === 'user-management-section') {
                fetchAllUsers();
            }
        });
    });

    // --- Date and Time Pickers ---
    M.Datepicker.init(document.querySelectorAll('.datepicker'), {
        format: 'yyyy-mm-dd',
        autoClose: true
    });
    M.Timepicker.init(document.querySelectorAll('.timepicker'), {
        defaultTime: 'now',
        autoClose: true,
        twelveHour: false,
        vibrate: true
    });


    // --- Tracking Status Visual Indicator Logic (Add Tracking) ---
    if (addStatusInput && addStatusCircle) {
        addStatusInput.addEventListener('input', function() {
            const status = this.value;
            addStatusCircle.className = 'status-circle'; // Reset classes
            addStatusCircle.classList.add(getStatusColorClass(status));
            // Apply blinking class if checkbox is checked
            if (addIsBlinkingCheckbox.checked) {
                addStatusCircle.classList.add('blinking');
            }
        });

        addIsBlinkingCheckbox.addEventListener('change', function() {
            if (this.checked) {
                addStatusCircle.classList.add('blinking');
            } else {
                addStatusCircle.classList.remove('blinking');
            }
        });
    }


    // --- Tracking Status Visual Indicator Logic (Update Tracking) ---
    if (updateStatusInput && updateStatusCircle && updateIsBlinkingOriginal) {
        updateStatusInput.addEventListener('input', function() {
            const status = this.value;
            updateStatusCircle.className = 'status-circle'; // Reset classes
            updateStatusCircle.classList.add(getStatusColorClass(status));
            // Apply blinking class if checkbox is checked
            if (updateIsBlinkingOriginal.checked) { // Use the correct ID for the checkbox
                updateStatusCircle.classList.add('blinking');
            }
        });

        updateIsBlinkingOriginal.addEventListener('change', function() {
            if (this.checked) {
                updateStatusCircle.classList.add('blinking');
            } else {
                updateStatusCircle.classList.remove('blinking');
            }
        });
    }

    // --- Create New Tracking ---
    if (addTrackingForm) {
        addTrackingForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const trackingData = {
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
                weight: parseFloat(document.getElementById('addWeight').value)
            };

            fetch('/api/admin/trackings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(trackingData)
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error adding tracking');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({ html: 'Tracking added successfully!', classes: 'green darken-2' });
                    addTrackingForm.reset();
                    M.updateTextFields(); // Update Materialize labels
                    // Re-initialize date/time pickers if needed after reset
                    M.Datepicker.init(document.querySelectorAll('.datepicker'));
                    M.Timepicker.init(document.querySelectorAll('.timepicker'));
                    addStatusCircle.className = 'status-circle'; // Reset indicator
                    fetchAllTrackings(); // Refresh all trackings table and dashboard stats
                    fetchTrackingIdsForSelect(); // Refresh dropdowns
                    fetchTrackingIdsForEmailSelect();
                    fetchTrackingIdsForAttachFileSelect();
                } else {
                    M.toast({ html: `Error: ${data.message || 'Could not add tracking.'}`, classes: 'red darken-2' });
                }
            })
            .catch(error => {
                console.error('Error adding tracking:', error);
                M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
            });
        });
    }

    // --- Fetch All Trackings (for table and dashboard stats) ---
    function fetchAllTrackings() {
        fetch('/api/admin/trackings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                    setTimeout(() => window.location.href = 'admin_login.html', 2000);
                }
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Server error fetching trackings');
                });
            }
            return response.json();
        })
        .then(trackings => {
            updateDashboardStats(trackings); // Update dashboard numbers
            if (allTrackingsTableBody) {
                allTrackingsTableBody.innerHTML = ''; // Clear existing rows
                if (trackings.length === 0) {
                    allTrackingsTableBody.innerHTML = '<tr><td colspan="14" style="text-align: center; padding: 20px;">No trackings found.</td></tr>';
                    return;
                }
                trackings.forEach(tracking => {
                    const row = document.createElement('tr');
                    const expectedDelivery = tracking.expectedDeliveryDate ?
                        new Date(tracking.expectedDeliveryDate).toLocaleDateString() + (tracking.expectedDeliveryTime ? ' ' + tracking.expectedDeliveryTime : '') : 'N/A';
                    const lastUpdated = new Date(tracking.updatedAt || tracking.createdAt).toLocaleString();

                    row.innerHTML = `
                        <td>${tracking.trackingId}</td>
                        <td>
                            <div class="status-indicator">
                                <div class="status-circle ${getStatusColorClass(tracking.status)} ${tracking.isBlinking ? 'blinking' : ''}"
                                    style="background-color: ${tracking.isBlinking ? tracking.blinkingDotColor : getStatusColorClass(tracking.status)}; border-color: ${tracking.statusLineColor};"></div>
                                ${tracking.status}
                            </div>
                        </td>
                        <td>${tracking.statusLineColor || 'N/A'}</td>
                        <td>${tracking.isBlinking ? 'Yes' : 'No'}</td>
                        <td>${tracking.senderName}</td>
                        <td>${tracking.recipientName}</td>
                        <td>${tracking.recipientEmail}</td>
                        <td>${tracking.packageContents}</td>
                        <td>${tracking.serviceType}</td>
                        <td>${tracking.recipientAddress}</td>
                        <td>${tracking.specialHandling || 'N/A'}</td>
                        <td>${expectedDelivery}</td>
                        <td>${lastUpdated}</td>
                        <td>
                            <button class="btn btn-small waves-effect waves-light blue darken-1 view-edit-btn" data-tracking-id="${tracking.trackingId}"><i class="material-icons">edit</i></button>
                            <button class="btn btn-small waves-effect waves-light red darken-2 delete-tracking-btn" data-tracking-id="${tracking.trackingId}"><i class="material-icons">delete</i></button>
                        </td>
                    `;
                    allTrackingsTableBody.appendChild(row);
                });

                // Attach event listeners for edit/delete buttons in the table
                document.querySelectorAll('.view-edit-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const trackingId = this.dataset.trackingId;
                        // Switch to 'Manage Single Tracking' section
                        showSection('manage-tracking-section');
                        // Set the select dropdown to this tracking ID and trigger its change event
                        const selectInstance = M.FormSelect.getInstance(singleTrackingIdSelect);
                        if (selectInstance) {
                            selectInstance.destroy(); // Destroy to prevent issues with setting value
                        }
                        singleTrackingIdSelect.value = trackingId;
                        M.FormSelect.init(singleTrackingIdSelect); // Re-initialize
                        singleTrackingIdSelect.dispatchEvent(new Event('change')); // Manually trigger change
                    });
                });

                document.querySelectorAll('.delete-tracking-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const trackingId = this.dataset.trackingId;
                        if (confirm(`Are you sure you want to delete tracking ID: ${trackingId}?`)) {
                            deleteTracking(trackingId);
                        }
                    });
                });
            }
        })
        .catch(error => {
            console.error('Error fetching all trackings:', error);
            if (allTrackingsTableBody) {
                allTrackingsTableBody.innerHTML = `<tr><td colspan="14" style="text-align: center; padding: 20px; color: red;">Failed to load trackings: ${error.message}</td></tr>`;
            }
            M.toast({ html: `Failed to load all trackings: ${error.message}`, classes: 'red darken-2' });
        });
    }

    // --- Fetch Tracking IDs for Select Dropdowns ---
    function populateSelect(selectElement, trackings, selectedValue = null) {
        if (!selectElement) return;

        // Clear existing options, keep the disabled default one
        selectElement.innerHTML = '<option value="" disabled selected>Select Tracking ID</option>';

        trackings.forEach(tracking => {
            const option = document.createElement('option');
            option.value = tracking.trackingId;
            option.textContent = tracking.trackingId;
            selectElement.appendChild(option);
        });

        if (selectedValue) {
            selectElement.value = selectedValue;
        }

        // Re-initialize Materialize select
        M.FormSelect.init(selectElement);
    }

    function fetchTrackingIdsForSelect() {
        fetch('/api/admin/trackings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch tracking IDs');
            return response.json();
        })
        .then(trackings => {
            populateSelect(singleTrackingIdSelect, trackings);
        })
        .catch(error => {
            console.error('Error fetching tracking IDs for select:', error);
            M.toast({ html: `Failed to load tracking IDs: ${error.message}`, classes: 'red darken-2' });
        });
    }

    function fetchTrackingIdsForEmailSelect() {
        fetch('/api/admin/trackings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch tracking IDs for email select');
            return response.json();
        })
        .then(trackings => {
            populateSelect(emailTrackingIdSelect, trackings);
        })
        .catch(error => {
            console.error('Error fetching tracking IDs for email select:', error);
        });
    }

    function fetchTrackingIdsForAttachFileSelect() {
        fetch('/api/admin/trackings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch tracking IDs for attachment select');
            return response.json();
        })
        .then(trackings => {
            populateSelect(attachFileTrackingIdSelect, trackings);
        })
        .catch(error => {
            console.error('Error fetching tracking IDs for attachment select:', error);
        });
    }

    // --- Fetch Single Tracking Details for Update Form ---
    if (singleTrackingIdSelect) {
        singleTrackingIdSelect.addEventListener('change', function() {
            const trackingId = this.value;
            if (!trackingId) {
                updateTrackingForm.style.display = 'none';
                return;
            }

            fetch(`/api/admin/trackings/${trackingId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error fetching tracking details');
                    });
                }
                return response.json();
            })
            .then(tracking => {
                updateTrackingMongoId.value = tracking._id;
                updateTrackingId.value = tracking.trackingId;
                updateStatusInput.value = tracking.status;
                updateIsBlinkingOriginal.checked = tracking.isBlinking || false; // Set checkbox state
                document.getElementById('updateStatusLineColor').value = tracking.statusLineColor || '#2196F3';
                document.getElementById('updateBlinkingDotColor').value = tracking.blinkingDotColor || '#FFFFFF';
                document.getElementById('updateSenderName').value = tracking.senderName;
                document.getElementById('updateRecipientName').value = tracking.recipientName;
                document.getElementById('updateRecipientEmail').value = tracking.recipientEmail;
                document.getElementById('updatePackageContents').value = tracking.packageContents || '';
                document.getElementById('updateServiceType').value = tracking.serviceType;
                document.getElementById('updateRecipientAddress').value = tracking.recipientAddress;
                document.getElementById('updateSpecialHandling').value = tracking.specialHandling || '';
                document.getElementById('updateExpectedDeliveryDate').value = tracking.expectedDeliveryDate ? new Date(tracking.expectedDeliveryDate).toISOString().split('T')[0] : '';
                document.getElementById('updateExpectedDeliveryTime').value = tracking.expectedDeliveryTime || '';
                document.getElementById('updateOrigin').value = tracking.origin || '';
                document.getElementById('updateDestination').value = tracking.destination || '';
                document.getElementById('updateWeight').value = tracking.weight || '';

                // Manually trigger input event for status to update color circle
                updateStatusInput.dispatchEvent(new Event('input'));
                updateIsBlinkingOriginal.dispatchEvent(new Event('change')); // Trigger change for blinking

                M.updateTextFields(); // Update Materialize labels
                // Re-init date/time pickers for the update form
                M.Datepicker.init(document.getElementById('updateExpectedDeliveryDate'));
                M.Timepicker.init(document.getElementById('updateExpectedDeliveryTime'));

                updateTrackingForm.style.display = 'block';
                fetchTrackingHistory(tracking._id); // Fetch and display history for this tracking
            })
            .catch(error => {
                console.error('Error fetching tracking details:', error);
                M.toast({ html: `Failed to load tracking details: ${error.message}`, classes: 'red darken-2' });
                updateTrackingForm.style.display = 'none';
            });
        });
    }

    // --- Update Tracking ---
    if (updateTrackingForm) {
        updateTrackingForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const mongoId = updateTrackingMongoId.value;
            const updatedData = {
                status: updateStatusInput.value,
                isBlinking: updateIsBlinkingOriginal.checked,
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
                weight: parseFloat(document.getElementById('updateWeight').value)
            };

            fetch(`/api/admin/trackings/${mongoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updatedData)
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error updating tracking');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({ html: 'Tracking updated successfully!', classes: 'green darken-2' });
                    fetchAllTrackings(); // Refresh all trackings table and dashboard stats
                    fetchTrackingIdsForSelect(); // Refresh dropdown
                    updateTrackingForm.style.display = 'none'; // Hide the form after update
                } else {
                    M.toast({ html: `Error: ${data.message || 'Could not update tracking.'}`, classes: 'red darken-2' });
                }
            })
            .catch(error => {
                console.error('Error updating tracking:', error);
                M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
            });
        });
    }

 // --- Delete Tracking ---
function deleteTracking(trackingId) {
    console.log('Attempting to delete tracking with ID:', trackingId);
    console.log('Type of tracking ID:', typeof trackingId);

    // Validate tracking ID format (24-character hex string)
    if (
        !trackingId ||
        typeof trackingId !== 'string' ||
        !trackingId.trim().match(/^[0-9a-fA-F]{24}$/)
    ) {
        M.toast({ html: 'Invalid tracking ID format on frontend.', classes: 'red darken-2' });
        console.error('Client-side validation failed: trackingId is', trackingId);
        return;
    }


     fetch(`/api/admin/trackings/${trackingId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                setTimeout(() => window.location.href = 'admin_login.html', 2000);
            }
            return response.json().then(errorData => {
                throw new Error(errorData.message || 'Server error deleting tracking');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            M.toast({ html: 'Tracking deleted successfully!', classes: 'green darken-2' });
            fetchAllTrackings();
            fetchTrackingIdsForSelect();
            fetchTrackingIdsForEmailSelect();
            fetchTrackingIdsForAttachFileSelect();
        } else {
            M.toast({ html: `Error: ${data.message || 'Could not delete tracking.'}`, classes: 'red darken-2' });
        }
    })
    .catch(error => {
        console.error('Error deleting tracking:', error);
        M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
    });
}
    


  // Assuming `trackingId` here is your custom, human-readable tracking ID (e.g., '7770947003939')
function fetchTrackingHistory(trackingId) { // Renamed parameter from mongoId to trackingId for clarity
    console.log(`Attempting to fetch history for tracking ID: ${trackingId}`); // Add a log for debugging
    fetch(`/api/admin/trackings/${trackingId}`, { // <-- Call the main GET route for tracking details
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                setTimeout(() => window.location.href = 'admin_login.html', 2000);
            }
            return response.json().then(errorData => {
                throw new Error(errorData.message || 'Server error fetching tracking details');
            });
        }
        return response.json();
    })
    .then(trackingData => { // The response is now the full tracking object, not just history
        const historyEvents = trackingData.history; // <--- Extract the history array here!

        const ul = trackingHistoryList.querySelector('ul');
        ul.innerHTML = ''; // Clear previous history

        if (!historyEvents || historyEvents.length === 0) {
            ul.innerHTML = '<li class="collection-item">No history events yet.</li>';
            return;
        }

        // Sort history by timestamp (assuming it's not already sorted on backend)
        historyEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        historyEvents.forEach(event => {
            const li = document.createElement('li');
            li.classList.add('collection-item');
            li.innerHTML = `
                <div class="history-content">
                    <strong>${new Date(event.timestamp).toLocaleString()}</strong> - ${event.location ? `${event.location}: ` : ''}${event.description}
                </div>
                <div class="history-actions">
                    <button class="btn-small waves-effect waves-light blue edit-history-btn"
                            data-tracking-mongo-id="${trackingData._id}" data-history-id="${event._id}"
                            data-date="${new Date(event.timestamp).toISOString().split('T')[0]}"
                            data-time="${new Date(event.timestamp).toTimeString().split(' ')[0].substring(0, 5)}"
                            data-location="${event.location || ''}"
                            data-description="${event.description}">
                        <i class="material-icons">edit</i>
                    </button>
                    <button class="btn-small waves-effect waves-light red delete-history-btn"
                            data-tracking-mongo-id="${trackingData._id}" data-history-id="${event._id}">
                        <i class="material-icons">delete</i>
                    </button>
                </div>
            `;
            ul.appendChild(li);
        });

        // Attach listeners to newly created history buttons
        attachHistoryButtonListeners();
    })
    .catch(error => {
        console.error('Error fetching tracking history:', error);
        const ul = trackingHistoryList.querySelector('ul');
        ul.innerHTML = `<li class="collection-item red-text">Failed to load history: ${error.message}</li>`;
        M.toast({ html: `Failed to load tracking history: ${error.message}`, classes: 'red darken-2' });
    });
}

    function attachHistoryButtonListeners() {
        document.querySelectorAll('.edit-history-btn').forEach(button => {
            button.addEventListener('click', function() {
                const trackingMongoId = this.dataset.trackingMongoId;
                const historyId = this.dataset.historyId;
                const date = this.dataset.date;
                const time = this.dataset.time;
                const location = this.dataset.location;
                const description = this.dataset.description;

                editHistoryModalTrackingMongoId.value = trackingMongoId;
                editHistoryModalHistoryId.value = historyId;
                editHistoryDate.value = date;
                editHistoryTime.value = time;
                editHistoryLocation.value = location;
                editHistoryDescription.value = description;

                M.updateTextFields(); // Update labels for pre-filled fields
                // Re-init date/time pickers for the modal
                M.Datepicker.init(editHistoryDate);
                M.Timepicker.init(editHistoryTime);

                M.Modal.getInstance(editHistoryModal).open();
            });
        });

        document.querySelectorAll('.delete-history-btn').forEach(button => {
            button.addEventListener('click', function() {
                const trackingMongoId = this.dataset.trackingMongoId;
                const historyId = this.dataset.historyId;
                if (confirm('Are you sure you want to delete this history event?')) {
                    deleteHistoryEvent(trackingMongoId, historyId);
                }
            });
        });
    }

    if (addHistoryForm) {
        addHistoryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const trackingMongoId = updateTrackingMongoId.value; // Get the ID of the currently selected tracking

            const newHistoryEvent = {
                timestamp: new Date(`${document.getElementById('newHistoryDate').value}T${document.getElementById('newHistoryTime').value}`).toISOString(),
                location: document.getElementById('newHistoryLocation').value,
                description: document.getElementById('newHistoryDescription').value
            };

            fetch(`/api/admin/trackings/${trackingMongoId}/history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(newHistoryEvent)
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error adding history event');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({ html: 'History event added successfully!', classes: 'green darken-2' });
                    addHistoryForm.reset();
                    M.updateTextFields();
                    M.Datepicker.init(document.getElementById('newHistoryDate'));
                    M.Timepicker.init(document.getElementById('newHistoryTime'));
                    fetchTrackingHistory(trackingMongoId); // Refresh history list
                } else {
                    M.toast({ html: `Error: ${data.message || 'Could not add history event.'}`, classes: 'red darken-2' });
                }
            })
            .catch(error => {
                console.error('Error adding history event:', error);
                M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
            });
        });
    }

    if (saveHistoryEditBtn) {
        saveHistoryEditBtn.addEventListener('click', function() {
            const trackingMongoId = editHistoryModalTrackingMongoId.value;
            const historyId = editHistoryModalHistoryId.value;

            const updatedHistoryEvent = {
                timestamp: new Date(`${editHistoryDate.value}T${editHistoryTime.value}`).toISOString(),
                location: editHistoryLocation.value,
                description: editHistoryDescription.value
            };

            fetch(`/api/admin/trackings/${trackingMongoId}/history/${historyId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updatedHistoryEvent)
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error updating history event');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({ html: 'History event updated successfully!', classes: 'green darken-2' });
                    M.Modal.getInstance(editHistoryModal).close();
                    fetchTrackingHistory(trackingMongoId); // Refresh history list
                } else {
                    M.toast({ html: `Error: ${data.message || 'Could not update history event.'}`, classes: 'red darken-2' });
                }
            })
            .catch(error => {
                console.error('Error updating history event:', error);
                M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
            });
        });
    }

    function deleteHistoryEvent(trackingMongoId, historyId) {
        fetch(`/api/admin/trackings/${trackingMongoId}/history/${historyId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                    setTimeout(() => window.location.href = 'admin_login.html', 2000);
                }
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Server error deleting history event');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                M.toast({ html: 'History event deleted successfully!', classes: 'red darken-2' });
                fetchTrackingHistory(trackingMongoId); // Refresh history list
            } else {
                M.toast({ html: `Error: ${data.message || 'Could not delete history event.'}`, classes: 'red darken-2' });
            }
        })
        .catch(error => {
            console.error('Error deleting history event:', error);
            M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
        });
    }


   // --- Send Email Notification ---
if (sendEmailForm) {
    sendEmailForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // 1. Get and trim the values from the input fields
        const recipient = notificationEmail.value.trim();
        const subject = emailSubject.value.trim();
        const message = notificationMessage.value.trim();
        const trackingId = emailTrackingIdSelect.value; // Get tracking ID value

        // 2. Perform client-side validation
        if (!recipient || !subject || !message) {
            M.toast({ html: 'Recipient, Subject, and Message fields are required.', classes: 'red darken-2' });
            return; // Stop the form submission if validation fails
        }
        
        // Optional: Validate trackingId if it's always required for sending emails
        if (!trackingId) {
            M.toast({ html: 'Please select a Tracking ID.', classes: 'red darken-2' });
            return;
        }

        // 3. If validation passes, proceed with creating FormData
        const formData = new FormData();
        formData.append('recipientEmail', recipient);
        formData.append('subject', subject);
        formData.append('message', message);
        formData.append('trackingId', trackingId); // Use the validated trackingId

        const attachment = emailAttachmentFileUpload.files[0];
        if (attachment) {
            formData.append('attachment', attachment);
        }

        fetch('/api/admin/send-email', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                    setTimeout(() => window.location.href = 'admin_login.html', 2000);
                }
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Server error sending email');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                M.toast({ html: 'Email sent successfully!', classes: 'green darken-2' });
                sendEmailForm.reset();
                M.updateTextFields();
                M.FormSelect.init(emailTrackingIdSelect); // Re-init select
            } else {
                M.toast({ html: `Error: ${data.message || 'Could not send email.'}`, classes: 'red darken-2' });
            }
        })
        .catch(error => {
            console.error('Error sending email:', error);
            M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
        });
    });
}
    // --- Pre-fill email on tracking ID selection ---
    if (emailTrackingIdSelect) {
        emailTrackingIdSelect.addEventListener('change', function() {
            const trackingId = this.value;
            if (trackingId) {
                fetch(`/api/admin/trackings/${trackingId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                })
                .then(response => {
                    if (!response.ok) throw new Error('Failed to fetch tracking details for email pre-fill');
                    return response.json();
                })
                .then(tracking => {
                    if (notificationEmail) notificationEmail.value = tracking.recipientEmail || '';
                    if (emailSubject) emailSubject.value = `Update on your FedEx Shipment: ${tracking.trackingId}`;
                    if (notificationMessage) notificationMessage.value = `Dear ${tracking.recipientName},\n\nYour shipment with tracking ID ${tracking.trackingId} is currently "${tracking.status}".\n\nLatest update: ${tracking.status} at ${new Date().toLocaleString()}.\n\nExpected delivery: ${new Date(tracking.expectedDeliveryDate).toLocaleDateString()}.\n\nThank you for choosing FedEx.`;
                    M.updateTextFields(); // Update Materialize labels
                })
                .catch(error => {
                    console.error('Error pre-filling email:', error);
                    M.toast({ html: `Could not pre-fill email: ${error.message}`, classes: 'red darken-2' });
                });
            } else {
                // Clear fields if no tracking ID is selected
                if (notificationEmail) notificationEmail.value = '';
                if (emailSubject) emailSubject.value = '';
                if (notificationMessage) notificationMessage.value = '';
                M.updateTextFields();
            }
        });
    }

    // --- Upload Package File ---
    if (uploadPackageFileForm) {
        uploadPackageFileForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const trackingId = attachFileTrackingIdSelect.value;
            const file = packageFileInput.files[0];

            if (!trackingId) {
                M.toast({ html: 'Please select a Tracking ID to link the file to.', classes: 'red darken-2' });
                return;
            }
            if (!file) {
                M.toast({ html: 'Please select a file to upload.', classes: 'red darken-2' });
                return;
            }

            const formData = new FormData();
            formData.append('packageFile', file); // 'packageFile' must match your backend's expected field name

            fetch(`/api/admin/trackings/${trackingId}/upload-file`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                    // Do NOT set Content-Type header when sending FormData, browser sets it correctly
                },
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error uploading file');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({ html: 'File uploaded and linked successfully!', classes: 'green darken-2' });
                    uploadPackageFileForm.reset();
                    M.updateTextFields();
                    M.FormSelect.init(attachFileTrackingIdSelect); // Re-init select
                } else {
                    M.toast({ html: `Error: ${data.message || 'Could not upload file.'}`, classes: 'red darken-2' });
                }
            })
            .catch(error => {
                console.error('Error uploading file:', error);
                M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
            });
        });
    }

    // --- User Management Functions ---

    // Fetch All Users
    function fetchAllUsers() {
        fetch('/api/admin/users', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                    setTimeout(() => window.location.href = 'admin_login.html', 2000);
                }
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Server error fetching users');
                });
            }
            return response.json();
        })
        .then(users => {
            if (usersTableBody) {
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
                            <button class="btn btn-small waves-effect waves-light blue darken-1 edit-user-btn" data-user-id="${user._id}"><i class="material-icons">edit</i></button>
                            <button class="btn btn-small waves-effect waves-light red darken-2 delete-user-modal-trigger" data-user-id="${user._id}" data-username="${user.username}"><i class="material-icons">delete</i></button>
                        </td>
                    `;
                    usersTableBody.appendChild(row);
                });

                // Attach event listeners for edit/delete user buttons
                document.querySelectorAll('.edit-user-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const userId = this.dataset.userId;
                        fetchUserDetails(userId);
                    });
                });

                document.querySelectorAll('.delete-user-modal-trigger').forEach(button => {
                    button.addEventListener('click', function() {
                        const userId = this.dataset.userId;
                        const userNm = this.dataset.username;
                        userIdToDeleteInput.value = userId;
                        if (usernameToDelete) usernameToDelete.textContent = userNm;
                        M.Modal.getInstance(deleteUserModalTrigger).open(); // Open the delete confirmation modal
                    });
                });
            }
        })
        .catch(error => {
            console.error('Error fetching users:', error);
            if (usersTableBody) {
                usersTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: red;">Failed to load users: ${error.message}</td></tr>`;
            }
            M.toast({ html: `Failed to load users: ${error.message}`, classes: 'red darken-2' });
        });
    }

    // Create User
    if (createUserForm) {
        createUserForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const userData = {
                username: document.getElementById('newUsername').value,
                email: document.getElementById('newEmail').value,
                password: document.getElementById('newPassword').value,
                role: document.getElementById('newUserRole').value
            };

            fetch('/api/admin/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(userData)
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        M.toast({
                            html: 'Session expired or unauthorized. Please log in again.',
                            classes: 'red darken-2'
                        });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error creating user');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({
                        html: 'User created successfully!',
                        classes: 'green darken-2'
                    });
                    M.Modal.getInstance(createUserModal).close();
                    createUserForm.reset();
                    M.updateTextFields();
                    M.FormSelect.init(document.querySelectorAll('#createUserModal select')); // Re-init selects
                    fetchAllUsers();
                } else {
                    M.toast({
                        html: `Error: ${data.message || 'Could not create user.'}`,
                        classes: 'red darken-2'
                    });
                }
            })
            .catch(error => {
                console.error('Error creating user:', error);
                M.toast({
                    html: `Network error or server issue: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
        });
    }

    // Fetch User Details for Edit
    function fetchUserDetails(userId) {
        fetch(`/api/admin/users/${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        M.toast({
                            html: 'Session expired or unauthorized. Please log in again.',
                            classes: 'red darken-2'
                        });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error fetching user details');
                    });
                }
                return response.json();
            })
            .then(user => {
                document.getElementById('editUserId').value = user._id;
                document.getElementById('editUsername').value = user.username;
                document.getElementById('editEmail').value = user.email;
                document.getElementById('editUserRole').value = user.role;
                M.updateTextFields();
                M.FormSelect.init(document.querySelectorAll('#editUserModal select')); // Re-init select
                M.Modal.getInstance(editUserModal).open();
            })
            .catch(error => {
                console.error('Error fetching user details:', error);
                M.toast({
                    html: `Failed to load user details: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    }

    // Update User
    if (editUserForm) {
        editUserForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const userId = document.getElementById('editUserId').value;
            const updatedUserData = {
                username: document.getElementById('editUsername').value,
                email: document.getElementById('editEmail').value,
                role: document.getElementById('editUserRole').value
            };

            const newPassword = document.getElementById('editPassword').value;
            if (newPassword) {
                updatedUserData.password = newPassword;
            }

            fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updatedUserData)
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        M.toast({
                            html: 'Session expired or unauthorized. Please log in again.',
                            classes: 'red darken-2'
                        });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error updating user');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({
                        html: 'User updated successfully!',
                        classes: 'green darken-2'
                    });
                    M.Modal.getInstance(editUserModal).close();
                    editUserForm.reset();
                    M.updateTextFields();
                    fetchAllUsers();
                } else {
                    M.toast({
                        html: `Error: ${data.message || 'Could not update user.'}`,
                        classes: 'red darken-2'
                    });
                }
            })
            .catch(error => {
                console.error('Error updating user:', error);
                M.toast({
                    html: `Network error or server issue: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
        });
    }

   // Delete User
if (deleteUserBtn) {
    deleteUserBtn.addEventListener('click', function() {
        const userId = userIdToDeleteInput.value.trim(); // Trim whitespace from the ID

        // Add client-side validation for userId
        if (!userId || userId.length === 0) {
            M.toast({
                html: 'Error: User ID is missing or invalid. Cannot delete.',
                classes: 'red darken-2'
            });
            console.error('Client-side validation failed: User ID is', userId);
            M.Modal.getInstance(deleteUserModalTrigger).close(); // Close modal if validation fails
            return; // Stop the function
        }

        fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    M.toast({
                        html: 'Session expired or unauthorized. Please log in again.',
                        classes: 'red darken-2'
                    });
                    setTimeout(() => window.location.href = 'admin_login.html', 2000);
                }
                return response.json().then(errorData => {
                    // Backend validation error would come through here
                    throw new Error(errorData.message || 'Server error deleting user');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                M.toast({
                    html: 'User deleted successfully!',
                    classes: 'green darken-2' // Changed to green for success messages
                });
                M.Modal.getInstance(deleteUserModalTrigger).close(); // Correctly close the modal
                fetchAllUsers(); // Refresh the user list
            } else {
                M.toast({
                    html: `Error: ${data.message || 'Could not delete user.'}`,
                    classes: 'red darken-2'
                });
            }
        })
        .catch(error => {
            console.error('Error deleting user:', error);
            M.toast({
                html: `Network error or server issue: ${error.message}`,
                classes: 'red darken-2'
            });
        });
    });
}


    // --- Dashboard Quick Stats Update ---
    function updateDashboardStats(trackings) {
        const total = trackings.length;
        const delivered = trackings.filter(t => t.status.toLowerCase().includes('delivered')).length;
        const inTransit = trackings.filter(t => t.status.toLowerCase().includes('in transit')).length;
        const pending = trackings.filter(t => t.status.toLowerCase().includes('pending') || t.status.toLowerCase().includes('on hold')).length;
        const exceptions = trackings.filter(t => t.status.toLowerCase().includes('exception') || t.status.toLowerCase().includes('delay')).length;

        if (totalPackages) totalPackages.textContent = total;
        if (deliveredPackages) deliveredPackages.textContent = delivered;
        if (inTransitPackages) inTransitPackages.textContent = inTransit;
        if (pendingPackages) pendingPackages.textContent = pending;
        if (exceptionsPackages) exceptionsPackages.textContent = exceptions;
    }

    function getStatusColorClass(status) {
        const lowerStatus = status.toLowerCase();
        if (lowerStatus.includes('delivered')) {
            return 'delivered';
        } else if (lowerStatus.includes('in transit')) {
            return 'in-transit';
        } else if (lowerStatus.includes('pending') || lowerStatus.includes('on hold')) {
            return 'pending';
        } else if (lowerStatus.includes('exception') || lowerStatus.includes('delay')) {
            return 'exception';
        } else {
            return 'unknown';
        }
    }


    // Initial load: show dashboard and fetch all trackings to populate stats
    showSection('dashboard-section');
    fetchAllTrackings(); // This will also call updateDashboardStats
    fetchTrackingIdsForSelect(); // Populate initial dropdowns
    fetchTrackingIdsForEmailSelect();
    fetchTrackingIdsForAttachFileSelect();


    // --- Sidebar Toggle Logic ---
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active'); // Toggle the 'active' class to show/hide the sidebar
        });
    } else {
        console.error("Sidebar or menu toggle button not found in the DOM.");
    }

    // Initialize Modals
    M.Modal.init(document.querySelectorAll('.modal'));
});
