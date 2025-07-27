document.addEventListener('DOMContentLoaded', function() {
    // Materialize CSS initialization for various components
    M.Sidenav.init(document.querySelectorAll('.sidenav'));
    M.FormSelect.init(document.querySelectorAll('select'));
    M.Datepicker.init(document.querySelectorAll('.datepicker'));
    M.Timepicker.init(document.querySelectorAll('.timepicker'));

    // DOM Elements
    const adminDashboardContent = document.getElementById('admin-dashboard-content');
    const updateTrackingForm = document.getElementById('updateTrackingForm');
    const updateTrackingMongoId = document.getElementById('updateTrackingMongoId'); // Hidden input for mongo ID
    const deleteTrackingForm = document.getElementById('deleteTrackingForm');
    const deleteTrackingIdInput = document.getElementById('deleteTrackingId');
    const addTrackingForm = document.getElementById('addTrackingForm');
    const trackingsTableBody = document.getElementById('trackingsTableBody');
    const searchTrackingIdInput = document.getElementById('searchTrackingId');
    const searchTrackingBtn = document.getElementById('searchTrackingBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const trackingHistoryList = document.getElementById('trackingHistoryList');
    const addHistoryForm = document.getElementById('addHistoryForm');
    const saveHistoryEditBtn = document.getElementById('saveHistoryEditBtn');
    const editHistoryModal = document.getElementById('editHistoryModal');
    const editHistoryModalTrackingMongoId = document.getElementById('editHistoryModalTrackingMongoId');
    const editHistoryModalHistoryId = document.getElementById('editHistoryModalHistoryId');
    const editHistoryDate = document.getElementById('editHistoryDate');
    const editHistoryTime = document.getElementById('editHistoryTime');
    const editHistoryLocation = document.getElementById('editHistoryLocation');
    const editHistoryDescription = document.getElementById('editHistoryDescription');
    const sendEmailForm = document.getElementById('sendEmailForm');
    const notificationEmail = document.getElementById('notificationEmail');
    const emailSubject = document.getElementById('emailSubject');
    const notificationMessage = document.getElementById('notificationMessage');
    const emailAttachmentFileUpload = document.getElementById('emailAttachmentFileUpload');
    const emailTrackingIdSelect = document.getElementById('emailTrackingId'); // Select for email
    const uploadPackageFileForm = document.getElementById('uploadPackageFileForm');
    const attachFileTrackingIdSelect = document.getElementById('attachFileTrackingId'); // Select for file upload
    const packageFileInput = document.getElementById('packageFileInput');

    // User Management Elements
    const usersTableBody = document.getElementById('usersTableBody');
    const createUserForm = document.getElementById('createUserForm');
    const createUserModal = document.getElementById('createUserModal');
    const editUserForm = document.getElementById('editUserForm');
    const editUserModal = document.getElementById('editUserModal');
    const deleteUserBtn = document.getElementById('confirmDeleteUserBtn');
    const userIdToDeleteInput = document.getElementById('userIdToDelete');
    const deleteUserModalTrigger = document.getElementById('deleteUserModal');
    const usernameToDelete = document.getElementById('usernameToDelete');

    // Dashboard Stats Elements
    const totalPackages = document.getElementById('totalPackages');
    const deliveredPackages = document.getElementById('deliveredPackages');
    const inTransitPackages = document.getElementById('inTransitPackages');
    const pendingPackages = document.getElementById('pendingPackages');
    const exceptionsPackages = document.getElementById('exceptionsPackages');

    // Sidebar and Menu Toggle
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');


    // --- Section Switching Logic ---
    function showSection(sectionId) {
        document.querySelectorAll('.admin-section').forEach(section => {
            section.style.display = 'none';
        });
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
            activeSection.style.display = 'block';
        }
    }

    document.querySelectorAll('.sidebar a').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = this.getAttribute('data-section');
            if (targetSection) {
                showSection(targetSection);
                // Close sidebar on item click for mobile/smaller screens
                const sidenavInstance = M.Sidenav.getInstance(document.querySelector('.sidenav'));
                if (sidenavInstance && sidenavInstance.isOpen) {
                    sidenavInstance.close();
                }
            }
            // Specific actions for sections
            if (targetSection === 'trackings-list-section') {
                fetchAllTrackings();
            } else if (targetSection === 'users-management-section') {
                fetchAllUsers();
            }
        });
    });

    // --- Tracking Management Functions ---

    // Fetch All Trackings (and update dashboard stats)
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
                        M.toast({
                            html: 'Session expired or unauthorized. Please log in again.',
                            classes: 'red darken-2'
                        });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error fetching trackings');
                    });
                }
                return response.json();
            })
            .then(trackings => {
                if (trackingsTableBody) {
                    trackingsTableBody.innerHTML = ''; // Clear existing rows
                    if (trackings.length === 0) {
                        trackingsTableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px;">No trackings found.</td></tr>';
                        updateDashboardStats([]); // Update stats with empty array
                        return;
                    }
                    trackings.forEach(tracking => {
                        const row = document.createElement('tr');
                        const statusClass = getStatusColorClass(tracking.status);
                        row.innerHTML = `
                            <td>${tracking.trackingId}</td>
                            <td>${tracking.shipperName}</td>
                            <td>${tracking.recipientName}</td>
                            <td>${tracking.currentLocation || 'N/A'}</td>
                            <td><span class="status-badge ${statusClass}">${tracking.status}</span></td>
                            <td>${new Date(tracking.expectedDeliveryDate).toLocaleDateString()}</td>
                            <td>${tracking.packageDescription || 'N/A'}</td>
                            <td>
                                <button class="btn btn-small waves-effect waves-light blue darken-1 edit-tracking-btn" data-id="${tracking._id}"><i class="material-icons">edit</i></button>
                                <button class="btn btn-small waves-effect waves-light red darken-2 delete-tracking-btn" data-id="${tracking._id}"><i class="material-icons">delete</i></button>
                                <button class="btn btn-small waves-effect waves-light grey darken-1 history-tracking-btn" data-id="${tracking._id}"><i class="material-icons">history</i></button>
                            </td>
                        `;
                        trackingsTableBody.appendChild(row);
                    });

                    // Attach event listeners for edit/delete/history buttons
                    document.querySelectorAll('.edit-tracking-btn').forEach(button => {
                        button.addEventListener('click', function() {
                            const mongoId = this.dataset.id;
                            fetchTrackingDetails(mongoId);
                        });
                    });

                    document.querySelectorAll('.delete-tracking-btn').forEach(button => {
                        button.addEventListener('click', function() {
                            const trackingId = this.dataset.id;
                            if (confirm('Are you sure you want to delete this tracking? This action cannot be undone.')) {
                                deleteTracking(trackingId);
                            }
                        });
                    });

                    document.querySelectorAll('.history-tracking-btn').forEach(button => {
                        button.addEventListener('click', function() {
                            const mongoId = this.dataset.id;
                            showSection('tracking-history-section');
                            fetchTrackingHistory(mongoId);
                            document.getElementById('addHistoryTrackingId').value = mongoId;
                            M.updateTextFields();
                        });
                    });

                    updateDashboardStats(trackings); // Update dashboard stats with fetched data
                }
            })
            .catch(error => {
                console.error('Error fetching trackings:', error);
                if (trackingsTableBody) {
                    trackingsTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: red;">Failed to load trackings: ${error.message}</td></tr>`;
                }
                M.toast({
                    html: `Failed to load trackings: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    }

    // Fetch Tracking IDs for Select Dropdowns
    function fetchTrackingIdsForSelect() {
        fetch('/api/admin/trackings/ids', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch tracking IDs');
                return response.json();
            })
            .then(data => {
                const updateSelect = document.getElementById('trackingIdSelect');
                if (updateSelect) {
                    updateSelect.innerHTML = '<option value="" disabled selected>Choose Tracking ID</option>'; // Clear and add default
                    data.trackingIds.forEach(t => {
                        const option = document.createElement('option');
                        option.value = t._id;
                        option.textContent = t.trackingId;
                        updateSelect.appendChild(option);
                    });
                    M.FormSelect.init(updateSelect); // Reinitialize Materialize select
                }
            })
            .catch(error => console.error('Error fetching tracking IDs for select:', error));
    }

    function fetchTrackingIdsForEmailSelect() {
        fetch('/api/admin/trackings/ids', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch tracking IDs for email');
                return response.json();
            })
            .then(data => {
                if (emailTrackingIdSelect) {
                    emailTrackingIdSelect.innerHTML = '<option value="" disabled selected>Choose Tracking ID</option>';
                    data.trackingIds.forEach(t => {
                        const option = document.createElement('option');
                        option.value = t._id;
                        option.textContent = t.trackingId;
                        emailTrackingIdSelect.appendChild(option);
                    });
                    M.FormSelect.init(emailTrackingIdSelect);
                }
            })
            .catch(error => console.error('Error fetching tracking IDs for email select:', error));
    }

    function fetchTrackingIdsForAttachFileSelect() {
        fetch('/api/admin/trackings/ids', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch tracking IDs for file upload');
                return response.json();
            })
            .then(data => {
                if (attachFileTrackingIdSelect) {
                    attachFileTrackingIdSelect.innerHTML = '<option value="" disabled selected>Choose Tracking ID</option>';
                    data.trackingIds.forEach(t => {
                        const option = document.createElement('option');
                        option.value = t._id;
                        option.textContent = t.trackingId;
                        attachFileTrackingIdSelect.appendChild(option);
                    });
                    M.FormSelect.init(attachFileTrackingIdSelect);
                }
            })
            .catch(error => console.error('Error fetching tracking IDs for attach file select:', error));
    }


    // Search Tracking by ID
    if (searchTrackingBtn) {
        searchTrackingBtn.addEventListener('click', function() {
            const trackingId = searchTrackingIdInput.value.trim();
            if (trackingId) {
                fetch(`/api/admin/trackings/search?trackingId=${trackingId}`, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    })
                    .then(response => {
                        if (!response.ok) {
                            if (response.status === 404) {
                                return response.json().then(errorData => {
                                    M.toast({
                                        html: errorData.message || 'Tracking not found.',
                                        classes: 'orange darken-2'
                                    });
                                    trackingsTableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px;">No matching tracking found.</td></tr>';
                                    return {
                                        trackings: []
                                    }; // Return empty array to update stats
                                });
                            }
                            if (response.status === 401 || response.status === 403) {
                                M.toast({
                                    html: 'Session expired or unauthorized. Please log in again.',
                                    classes: 'red darken-2'
                                });
                                setTimeout(() => window.location.href = 'admin_login.html', 2000);
                            }
                            return response.json().then(errorData => {
                                throw new Error(errorData.message || 'Server error searching tracking');
                            });
                        }
                        return response.json();
                    })
                    .then(data => {
                        const trackings = data.trackings || [];
                        if (trackingsTableBody) {
                            trackingsTableBody.innerHTML = '';
                            if (trackings.length === 0) {
                                trackingsTableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px;">No matching tracking found.</td></tr>';
                            } else {
                                trackings.forEach(tracking => {
                                    const row = document.createElement('tr');
                                    const statusClass = getStatusColorClass(tracking.status);
                                    row.innerHTML = `
                                        <td>${tracking.trackingId}</td>
                                        <td>${tracking.shipperName}</td>
                                        <td>${tracking.recipientName}</td>
                                        <td>${tracking.currentLocation || 'N/A'}</td>
                                        <td><span class="status-badge ${statusClass}">${tracking.status}</span></td>
                                        <td>${new Date(tracking.expectedDeliveryDate).toLocaleDateString()}</td>
                                        <td>${tracking.packageDescription || 'N/A'}</td>
                                        <td>
                                            <button class="btn btn-small waves-effect waves-light blue darken-1 edit-tracking-btn" data-id="${tracking._id}"><i class="material-icons">edit</i></button>
                                            <button class="btn btn-small waves-effect waves-light red darken-2 delete-tracking-btn" data-id="${tracking._id}"><i class="material-icons">delete</i></button>
                                            <button class="btn btn-small waves-effect waves-light grey darken-1 history-tracking-btn" data-id="${tracking._id}"><i class="material-icons">history</i></button>
                                        </td>
                                    `;
                                    trackingsTableBody.appendChild(row);
                                });

                                // Re-attach listeners for dynamically added buttons
                                document.querySelectorAll('.edit-tracking-btn').forEach(button => {
                                    button.addEventListener('click', function() {
                                        const mongoId = this.dataset.id;
                                        fetchTrackingDetails(mongoId);
                                    });
                                });
                                document.querySelectorAll('.delete-tracking-btn').forEach(button => {
                                    button.addEventListener('click', function() {
                                        const trackingId = this.dataset.id;
                                        if (confirm('Are you sure you want to delete this tracking?')) {
                                            deleteTracking(trackingId);
                                        }
                                    });
                                });
                                document.querySelectorAll('.history-tracking-btn').forEach(button => {
                                    button.addEventListener('click', function() {
                                        const mongoId = this.dataset.id;
                                        showSection('tracking-history-section');
                                        fetchTrackingHistory(mongoId);
                                        document.getElementById('addHistoryTrackingId').value = mongoId;
                                        M.updateTextFields();
                                    });
                                });
                            }
                        }
                        updateDashboardStats(trackings); // Update dashboard stats based on search results
                    })
                    .catch(error => {
                        console.error('Error searching tracking:', error);
                        M.toast({
                            html: `Network error or server issue during search: ${error.message}`,
                            classes: 'red darken-2'
                        });
                        if (trackingsTableBody) {
                            trackingsTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: red;">Error searching: ${error.message}</td></tr>`;
                        }
                    });
            } else {
                M.toast({
                    html: 'Please enter a tracking ID to search.',
                    classes: 'orange darken-2'
                });
                fetchAllTrackings(); // Fetch all if search input is empty
            }
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            searchTrackingIdInput.value = '';
            M.updateTextFields(); // Reset Materialize label
            fetchAllTrackings(); // Refresh the list to show all trackings
        });
    }


    // Add New Tracking
    if (addTrackingForm) {
        addTrackingForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const newTracking = {
                trackingId: document.getElementById('newTrackingId').value,
                shipperName: document.getElementById('newShipperName').value,
                shipperAddress: document.getElementById('newShipperAddress').value,
                recipientName: document.getElementById('newRecipientName').value,
                recipientAddress: document.getElementById('newRecipientAddress').value,
                recipientEmail: document.getElementById('newRecipientEmail').value,
                currentLocation: document.getElementById('newCurrentLocation').value,
                status: document.getElementById('newStatus').value,
                expectedDeliveryDate: document.getElementById('newExpectedDeliveryDate').value,
                packageDescription: document.getElementById('newPackageDescription').value,
                weight: parseFloat(document.getElementById('newWeight').value),
                dimensions: document.getElementById('newDimensions').value,
                serviceType: document.getElementById('newServiceType').value,
                trackingHistory: [] // Initialize with an empty array
            };

            fetch('/api/admin/trackings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(newTracking)
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
                            throw new Error(errorData.message || 'Server error adding tracking');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        M.toast({
                            html: 'Tracking added successfully!',
                            classes: 'green darken-2'
                        });
                        addTrackingForm.reset();
                        M.updateTextFields(); // Reset Materialize labels
                        M.Datepicker.init(document.getElementById('newExpectedDeliveryDate')); // Re-init datepicker
                        M.FormSelect.init(document.getElementById('newStatus')); // Re-init select
                        M.FormSelect.init(document.getElementById('newServiceType')); // Re-init select
                        fetchAllTrackings(); // Refresh table and dashboard stats
                        fetchTrackingIdsForSelect(); // Refresh dropdowns
                        fetchTrackingIdsForEmailSelect();
                        fetchTrackingIdsForAttachFileSelect();
                    } else {
                        M.toast({
                            html: `Error: ${data.message || 'Could not add tracking.'}`,
                            classes: 'red darken-2'
                        });
                    }
                })
                .catch(error => {
                    console.error('Error adding tracking:', error);
                    M.toast({
                        html: `Network error or server issue: ${error.message}`,
                        classes: 'red darken-2'
                    });
                });
        });
    }

    // Fetch Tracking Details for Edit Form
    function fetchTrackingDetails(mongoId) {
        fetch(`/api/admin/trackings/${mongoId}`, {
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
                        throw new Error(errorData.message || 'Server error fetching tracking details');
                    });
                }
                return response.json();
            })
            .then(tracking => {
                updateTrackingMongoId.value = tracking._id; // Hidden ID field
                document.getElementById('updateTrackingId').value = tracking.trackingId;
                document.getElementById('updateShipperName').value = tracking.shipperName;
                document.getElementById('updateShipperAddress').value = tracking.shipperAddress;
                document.getElementById('updateRecipientName').value = tracking.recipientName;
                document.getElementById('updateRecipientAddress').value = tracking.recipientAddress;
                document.getElementById('updateRecipientEmail').value = tracking.recipientEmail;
                document.getElementById('updateCurrentLocation').value = tracking.currentLocation;
                document.getElementById('updateStatus').value = tracking.status;
                document.getElementById('updateExpectedDeliveryDate').value = new Date(tracking.expectedDeliveryDate).toISOString().split('T')[0]; // Format for date picker
                document.getElementById('updatePackageDescription').value = tracking.packageDescription;
                document.getElementById('updateWeight').value = tracking.weight;
                document.getElementById('updateDimensions').value = tracking.dimensions;
                document.getElementById('updateServiceType').value = tracking.serviceType;

                M.updateTextFields(); // Update Materialize labels
                M.FormSelect.init(document.getElementById('updateStatus')); // Reinitialize Materialize select
                M.FormSelect.init(document.getElementById('updateServiceType')); // Reinitialize Materialize select
                M.Datepicker.init(document.getElementById('updateExpectedDeliveryDate')); // Reinitialize date picker

                updateTrackingForm.style.display = 'block'; // Show the update form
                // Also ensure the correct section is visible if not already
                showSection('update-tracking-section');
            })
            .catch(error => {
                console.error('Error fetching tracking details:', error);
                M.toast({
                    html: `Failed to load tracking details: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    }

    // Update Tracking
    if (updateTrackingForm) {
        updateTrackingForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const mongoId = updateTrackingMongoId.value;
            const updatedData = {
                trackingId: document.getElementById('updateTrackingId').value,
                shipperName: document.getElementById('updateShipperName').value,
                shipperAddress: document.getElementById('updateShipperAddress').value,
                recipientName: document.getElementById('updateRecipientName').value,
                recipientAddress: document.getElementById('updateRecipientAddress').value,
                recipientEmail: document.getElementById('updateRecipientEmail').value,
                currentLocation: document.getElementById('updateCurrentLocation').value,
                status: document.getElementById('updateStatus').value,
                expectedDeliveryDate: document.getElementById('updateExpectedDeliveryDate').value,
                packageDescription: document.getElementById('updatePackageDescription').value,
                weight: parseFloat(document.getElementById('updateWeight').value),
                dimensions: document.getElementById('updateDimensions').value,
                serviceType: document.getElementById('updateServiceType').value,
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
                            M.toast({
                                html: 'Session expired or unauthorized. Please log in again.',
                                classes: 'red darken-2'
                            });
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
                        M.toast({
                            html: 'Tracking updated successfully!',
                            classes: 'green darken-2'
                        });
                        fetchAllTrackings(); // Refresh all trackings table and dashboard stats
                        fetchTrackingIdsForSelect(); // Refresh dropdown
                        updateTrackingForm.style.display = 'none'; // Hide the form after update
                    } else {
                        M.toast({
                            html: `Error: ${data.message || 'Could not update tracking.'}`,
                            classes: 'red darken-2'
                        });
                    }
                })
                .catch(error => {
                    console.error('Error updating tracking:', error);
                    M.toast({
                        html: `Network error or server issue: ${error.message}`,
                        classes: 'red darken-2'
                    });
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
            M.toast({
                html: 'Invalid tracking ID format on frontend.',
                classes: 'red darken-2'
            });
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
                        M.toast({
                            html: 'Session expired or unauthorized. Please log in again.',
                            classes: 'red darken-2'
                        });
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
                    M.toast({
                        html: 'Tracking deleted successfully!',
                        classes: 'green darken-2'
                    });
                    fetchAllTrackings();
                    fetchTrackingIdsForSelect();
                    fetchTrackingIdsForEmailSelect();
                    fetchTrackingIdsForAttachFileSelect();
                } else {
                    M.toast({
                        html: `Error: ${data.message || 'Could not delete tracking.'}`,
                        classes: 'red darken-2'
                    });
                }
            })
            .catch(error => {
                console.error('Error deleting tracking:', error);
                M.toast({
                    html: `Network error or server issue: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    }


    function fetchTrackingHistory(trackingId) {
        fetch(`/api/admin/trackings/${trackingId}/history`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Failed to fetch history');
                    });
                }
                return response.json();
            })
            .then(data => {
                const historyEvents = data.history;
                const ul = trackingHistoryList.querySelector('ul');
                ul.innerHTML = ''; // Clear previous

                if (!historyEvents || historyEvents.length === 0) {
                    ul.innerHTML = '<li class="collection-item">No history events yet.</li>';
                    return;
                }

                // ✅ Sort by timestamp
                historyEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                historyEvents.forEach(event => {
                    const li = document.createElement('li');
                    li.classList.add('collection-item');
                    li.innerHTML = `
                        <div class="history-content">
                            <strong>${new Date(event.timestamp).toLocaleString()}</strong> -
                            ${event.location ? `${event.location}: ` : ''}${event.description}
                        </div>
                        <div class="history-actions">
                            <button class="btn-small waves-effect waves-light blue edit-history-btn"
                                    data-tracking-mongo-id="${trackingId}" data-history-id="${event._id}"
                                    data-date="${new Date(event.timestamp).toISOString().split('T')[0]}"
                                    data-time="${new Date(event.timestamp).toTimeString().split(' ')[0].substring(0, 5)}"
                                    data-location="${event.location || ''}"
                                    data-description="${event.description}">
                                <i class="material-icons">edit</i>
                            </button>
                            <button class="btn-small waves-effect waves-light red delete-history-btn"
                                    data-tracking-mongo-id="${trackingId}" data-history-id="${event._id}">
                                <i class="material-icons">delete</i>
                            </button>
                        </div>
                    `;
                    ul.appendChild(li);
                });

                // ✅ Properly placed listener attachment
                attachHistoryButtonListeners();
            })
            .catch(error => {
                console.error('Error fetching tracking history:', error);
                const ul = trackingHistoryList.querySelector('ul');
                ul.innerHTML = `<li class="collection-item red-text">Failed to load history: ${error.message}</li>`;
                M.toast({
                    html: `Failed to load tracking history: ${error.message}`,
                    classes: 'red darken-2'
                });
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
            const trackingMongoId = document.getElementById('addHistoryTrackingId').value; // Get the ID of the currently selected tracking

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
                            M.toast({
                                html: 'Session expired or unauthorized. Please log in again.',
                                classes: 'red darken-2'
                            });
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
                        M.toast({
                            html: 'History event added successfully!',
                            classes: 'green darken-2'
                        });
                        addHistoryForm.reset();
                        M.updateTextFields();
                        // Re-init pickers after reset to ensure they still function
                        M.Datepicker.init(document.getElementById('newHistoryDate'));
                        M.Timepicker.init(document.getElementById('newHistoryTime'));
                        fetchTrackingHistory(trackingMongoId); // Refresh history list
                    } else {
                        M.toast({
                            html: `Error: ${data.message || 'Could not add history event.'}`,
                            classes: 'red darken-2'
                        });
                    }
                })
                .catch(error => {
                    console.error('Error adding history event:', error);
                    M.toast({
                        html: `Network error or server issue: ${error.message}`,
                        classes: 'red darken-2'
                    });
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
                            M.toast({
                                html: 'Session expired or unauthorized. Please log in again.',
                                classes: 'red darken-2'
                            });
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
                        M.toast({
                            html: 'History event updated successfully!',
                            classes: 'green darken-2'
                        });
                        M.Modal.getInstance(editHistoryModal).close();
                        fetchTrackingHistory(trackingMongoId); // Refresh history list
                    } else {
                        M.toast({
                            html: `Error: ${data.message || 'Could not update history event.'}`,
                            classes: 'red darken-2'
                        });
                    }
                })
                .catch(error => {
                    console.error('Error updating history event:', error);
                    M.toast({
                        html: `Network error or server issue: ${error.message}`,
                        classes: 'red darken-2'
                    });
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
                        M.toast({
                            html: 'Session expired or unauthorized. Please log in again.',
                            classes: 'red darken-2'
                        });
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
                    M.toast({
                        html: 'History event deleted successfully!',
                        classes: 'red darken-2'
                    });
                    fetchTrackingHistory(trackingMongoId); // Refresh history list
                } else {
                    M.toast({
                        html: `Error: ${data.message || 'Could not delete history event.'}`,
                        classes: 'red darken-2'
                    });
                }
            })
            .catch(error => {
                console.error('Error deleting history event:', error);
                M.toast({
                    html: `Network error or server issue: ${error.message}`,
                    classes: 'red darken-2'
                });
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
                M.toast({
                    html: 'Recipient, Subject, and Message fields are required.',
                    classes: 'red darken-2'
                });
                return; // Stop the form submission if validation fails
            }

            // Optional: Validate trackingId if it's always required for sending emails
            if (!trackingId) {
                M.toast({
                    html: 'Please select a Tracking ID.',
                    classes: 'red darken-2'
                });
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
                            M.toast({
                                html: 'Session expired or unauthorized. Please log in again.',
                                classes: 'red darken-2'
                            });
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
                        M.toast({
                            html: 'Email sent successfully!',
                            classes: 'green darken-2'
                        });
                        sendEmailForm.reset();
                        M.updateTextFields();
                        M.FormSelect.init(emailTrackingIdSelect); // Re-init select
                    } else {
                        M.toast({
                            html: `Error: ${data.message || 'Could not send email.'}`,
                            classes: 'red darken-2'
                        });
                    }
                })
                .catch(error => {
                    console.error('Error sending email:', error);
                    M.toast({
                        html: `Network error or server issue: ${error.message}`,
                        classes: 'red darken-2'
                    });
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
                        M.toast({
                            html: `Could not pre-fill email: ${error.message}`,
                            classes: 'red darken-2'
                        });
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
                M.toast({
                    html: 'Please select a Tracking ID to link the file to.',
                    classes: 'red darken-2'
                });
                return;
            }
            if (!file) {
                M.toast({
                    html: 'Please select a file to upload.',
                    classes: 'red darken-2'
                });
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
                            M.toast({
                                html: 'Session expired or unauthorized. Please log in again.',
                                classes: 'red darken-2'
                            });
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
                        M.toast({
                            html: 'File uploaded and linked successfully!',
                            classes: 'green darken-2'
                        });
                        uploadPackageFileForm.reset();
                        M.updateTextFields();
                        M.FormSelect.init(attachFileTrackingIdSelect); // Re-init select
                    } else {
                        M.toast({
                            html: `Error: ${data.message || 'Could not upload file.'}`,
                            classes: 'red darken-2'
                        });
                    }
                })
                .catch(error => {
                    console.error('Error uploading file:', error);
                    M.toast({
                        html: `Network error or server issue: ${error.message}`,
                        classes: 'red darken-2'
                    });
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
                        M.toast({
                            html: 'Session expired or unauthorized. Please log in again.',
                            classes: 'red darken-2'
                        });
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
                M.toast({
                    html: `Failed to load users: ${error.message}`,
                    classes: 'red darken-2'
                });
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
}); // This closing brace was likely missing or misplaced
