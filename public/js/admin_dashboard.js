document.addEventListener('DOMContentLoaded', function() {
    // Initialize Materialize Components
    M.Sidenav.init(document.querySelectorAll('.sidenav'));
    M.FormSelect.init(document.querySelectorAll('select'));
    M.Datepicker.init(document.querySelectorAll('.datepicker'));
    M.Timepicker.init(document.querySelectorAll('.timepicker'));
    M.Modal.init(document.querySelectorAll('.modal'));

    // Helper function to show/hide sections
    function showSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById(sectionId).style.display = 'block';

        // Add active class to corresponding nav item
        document.querySelectorAll('.sidenav li').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`.sidenav li a[href="#${sectionId}"]`).parentElement.classList.add('active');
    }

    // --- Navigation Event Listeners ---
    document.getElementById('dashboard-link').addEventListener('click', function(e) {
        e.preventDefault();
        showSection('dashboard-section');
        fetchAllTrackings(); // Refresh dashboard stats
    });

    document.getElementById('create-tracking-link').addEventListener('click', function(e) {
        e.preventDefault();
        showSection('create-tracking-section');
        // Clear form fields when navigating to create new tracking
        document.getElementById('createTrackingForm').reset();
        M.updateTextFields();
        M.FormSelect.init(document.querySelectorAll('#createTrackingForm select')); // Re-init selects
    });

    document.getElementById('manage-tracking-link').addEventListener('click', function(e) {
        e.preventDefault();
        showSection('manage-tracking-section');
        fetchTrackingIdsForSelect(); // Populate the dropdown for managing single trackings
        document.getElementById('singleTrackingForm').reset(); // Clear form
        M.updateTextFields();
    });

    document.getElementById('all-trackings-link').addEventListener('click', function(e) {
        e.preventDefault();
        showSection('all-trackings-section');
        fetchAllTrackings(); // Refresh all trackings table
    });

    document.getElementById('manage-users-link').addEventListener('click', function(e) {
        e.preventDefault();
        showSection('manage-users-section');
        fetchAllUsers(); // Populate the users table
    });

    document.getElementById('communication-center-link').addEventListener('click', function(e) {
        e.preventDefault();
        showSection('communication-center-section');
        fetchTrackingIdsForEmailSelect(); // Populate tracking IDs for email
    });

    document.getElementById('file-upload-link').addEventListener('click', function(e) {
        e.preventDefault();
        showSection('file-upload-section');
        fetchTrackingIdsForAttachFileSelect(); // Populate tracking IDs for file upload
    });

    document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        M.toast({
            html: 'Logged out successfully.',
            classes: 'green'
        });
        setTimeout(() => window.location.href = 'admin_login.html', 1500);
    });

    // --- 1. Create New Tracking Form ---
    document.getElementById('createTrackingForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = {
            trackingId: document.getElementById('newTrackingId').value,
            status: document.getElementById('newStatus').value,
            statusLineColor: document.getElementById('newStatusLineColor').value,
            isBlinking: document.getElementById('newIsBlinking').checked,
            senderName: document.getElementById('newSenderName').value,
            senderAddress: document.getElementById('newSenderAddress').value,
            recipientName: document.getElementById('newRecipientName').value,
            recipientAddress: document.getElementById('newRecipientAddress').value,
            recipientEmail: document.getElementById('newRecipientEmail').value,
            packageContents: document.getElementById('newPackageContents').value,
            serviceType: document.getElementById('newServiceType').value,
            weight: document.getElementById('newWeight').value,
            dimensions: document.getElementById('newDimensions').value,
            specialHandling: document.getElementById('newSpecialHandling').value,
            originFacility: document.getElementById('newOriginFacility').value,
            destinationFacility: document.getElementById('newDestinationFacility').value,
            currentLocation: document.getElementById('newCurrentLocation').value,
            expectedDeliveryDate: document.getElementById('newExpectedDeliveryDate').value,
            expectedDeliveryTime: document.getElementById('newExpectedDeliveryTime').value,
            remarks: document.getElementById('newRemarks').value,
            cost: document.getElementById('newCost').value,
            paymentStatus: document.getElementById('newPaymentStatus').value,
        };

        fetch('/api/admin/trackings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
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
                        throw new Error(errorData.message || 'Server error creating tracking');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({
                        html: 'Tracking created successfully!',
                        classes: 'green darken-2'
                    });
                    document.getElementById('createTrackingForm').reset();
                    M.updateTextFields(); // Reset Materialize textfield labels
                    M.FormSelect.init(document.querySelectorAll('#createTrackingForm select')); // Re-init selects
                    fetchAllTrackings(); // Refresh the all trackings table and dashboard stats
                    fetchTrackingIdsForSelect(); // Refresh single tracking dropdown
                    fetchTrackingIdsForEmailSelect(); // Refresh email tracking dropdown
                    fetchTrackingIdsForAttachFileSelect(); // Refresh file upload tracking dropdown
                } else {
                    M.toast({
                        html: `Error: ${data.message || 'Could not create tracking.'}`,
                        classes: 'red darken-2'
                    });
                }
            })
            .catch(error => {
                console.error('Error creating tracking:', error);
                M.toast({
                    html: `Network error or server issue: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    });

    // --- 2. Manage Single Tracking ---
    const singleTrackingIdSelect = document.getElementById('singleTrackingIdSelect');
    const singleTrackingForm = document.getElementById('singleTrackingForm');
    const updateTrackingBtn = document.getElementById('updateTrackingBtn');
    const addTrackingHistoryBtn = document.getElementById('addTrackingHistoryBtn');
    const trackingHistoryList = document.getElementById('trackingHistoryList');
    const deleteHistoryModalTrigger = document.getElementById('deleteTrackingHistoryModalTrigger');
    const deleteTrackingHistoryBtn = document.getElementById('deleteTrackingHistoryBtn');
    const historyIdToDeleteInput = document.getElementById('historyIdToDelete');
    const viewFilesBtn = document.getElementById('viewFilesBtn');
    const packageFilesList = document.getElementById('packageFilesList');
    const deleteFileModalTrigger = document.getElementById('deleteFileModalTrigger');
    const deletePackageFileBtn = document.getElementById('deletePackageFileBtn');
    const fileIdToDeleteInput = document.getElementById('fileIdToDelete');


    function fetchTrackingIdsForSelect() {
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
                        throw new Error(errorData.message || 'Server error fetching tracking IDs');
                    });
                }
                return response.json();
            })
            .then(trackings => {
                singleTrackingIdSelect.innerHTML = '<option value="" disabled selected>Select Tracking ID</option>';
                trackings.forEach(tracking => {
                    const option = document.createElement('option');
                    option.value = tracking._id; // Use MongoDB _id
                    option.textContent = tracking.trackingId; // Display trackingId
                    singleTrackingIdSelect.appendChild(option);
                });
                M.FormSelect.init(singleTrackingIdSelect); // Re-initialize Materialize select
            })
            .catch(error => {
                console.error('Error fetching tracking IDs:', error);
                M.toast({
                    html: `Error fetching tracking IDs: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    }

    singleTrackingIdSelect.addEventListener('change', function() {
        const trackingMongoId = this.value;
        if (trackingMongoId) {
            fetchTrackingDetails(trackingMongoId);
        } else {
            singleTrackingForm.reset();
            M.updateTextFields();
            trackingHistoryList.innerHTML = '<li class="collection-item">Select a tracking to view history.</li>';
            packageFilesList.innerHTML = '<li class="collection-item">Select a tracking to view files.</li>';
        }
    });

    function fetchTrackingDetails(trackingMongoId) {
        fetch(`/api/admin/trackings/${trackingMongoId}`, {
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
                document.getElementById('trackingMongoId').value = tracking._id; // Hidden field for _id
                document.getElementById('currentTrackingId').value = tracking.trackingId;
                document.getElementById('status').value = tracking.status;
                document.getElementById('statusLineColor').value = tracking.statusLineColor;
                document.getElementById('isBlinking').checked = tracking.isBlinking;
                document.getElementById('senderName').value = tracking.senderName;
                document.getElementById('senderAddress').value = tracking.senderAddress;
                document.getElementById('recipientName').value = tracking.recipientName;
                document.getElementById('recipientAddress').value = tracking.recipientAddress;
                document.getElementById('recipientEmail').value = tracking.recipientEmail;
                document.getElementById('packageContents').value = tracking.packageContents;
                document.getElementById('serviceType').value = tracking.serviceType;
                document.getElementById('weight').value = tracking.weight;
                document.getElementById('dimensions').value = tracking.dimensions;
                document.getElementById('specialHandling').value = tracking.specialHandling;
                document.getElementById('originFacility').value = tracking.originFacility;
                document.getElementById('destinationFacility').value = tracking.destinationFacility;
                document.getElementById('currentLocation').value = tracking.currentLocation;
                document.getElementById('expectedDeliveryDate').value = tracking.expectedDeliveryDate; // Datepicker will parse this
                document.getElementById('expectedDeliveryTime').value = tracking.expectedDeliveryTime; // Timepicker will parse this
                document.getElementById('remarks').value = tracking.remarks;
                document.getElementById('cost').value = tracking.cost;
                document.getElementById('paymentStatus').value = tracking.paymentStatus;

                M.updateTextFields(); // Re-initialize text field labels
                M.FormSelect.init(document.querySelectorAll('#singleTrackingForm select')); // Re-init selects
                M.Datepicker.getInstance(document.getElementById('expectedDeliveryDate')).setDate(new Date(tracking.expectedDeliveryDate));
                M.Timepicker.getInstance(document.getElementById('expectedDeliveryTime')).setDate(new Date(`2000-01-01T${tracking.expectedDeliveryTime}`)); // Dummy date for timepicker

                renderTrackingHistory(tracking.history);
                renderPackageFiles(tracking.packageFiles);
            })
            .catch(error => {
                console.error('Error fetching tracking details:', error);
                M.toast({
                    html: `Failed to load tracking details: ${error.message}`,
                    classes: 'red darken-2'
                });
                singleTrackingForm.reset();
                M.updateTextFields();
                trackingHistoryList.innerHTML = '<li class="collection-item">Error loading history.</li>';
                packageFilesList.innerHTML = '<li class="collection-item">Error loading files.</li>';
            });
    }

    // Update Tracking Details
    updateTrackingBtn.addEventListener('click', function() {
        const trackingMongoId = document.getElementById('trackingMongoId').value;
        if (!trackingMongoId) {
            M.toast({
                html: 'Please select a tracking to update.',
                classes: 'red darken-2'
            });
            return;
        }

        const updatedData = {
            trackingId: document.getElementById('currentTrackingId').value,
            status: document.getElementById('status').value,
            statusLineColor: document.getElementById('statusLineColor').value,
            isBlinking: document.getElementById('isBlinking').checked,
            senderName: document.getElementById('senderName').value,
            senderAddress: document.getElementById('senderAddress').value,
            recipientName: document.getElementById('recipientName').value,
            recipientAddress: document.getElementById('recipientAddress').value,
            recipientEmail: document.getElementById('recipientEmail').value,
            packageContents: document.getElementById('packageContents').value,
            serviceType: document.getElementById('serviceType').value,
            weight: document.getElementById('weight').value,
            dimensions: document.getElementById('dimensions').value,
            specialHandling: document.getElementById('specialHandling').value,
            originFacility: document.getElementById('originFacility').value,
            destinationFacility: document.getElementById('destinationFacility').value,
            currentLocation: document.getElementById('currentLocation').value,
            expectedDeliveryDate: document.getElementById('expectedDeliveryDate').value,
            expectedDeliveryTime: document.getElementById('expectedDeliveryTime').value,
            remarks: document.getElementById('remarks').value,
            cost: document.getElementById('cost').value,
            paymentStatus: document.getElementById('paymentStatus').value,
        };

        fetch(`/api/admin/trackings/${trackingMongoId}`, {
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
                    fetchTrackingIdsForSelect(); // Refresh single tracking dropdown
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

    // Add Tracking History
    addTrackingHistoryBtn.addEventListener('click', function() {
        const trackingMongoId = document.getElementById('trackingMongoId').value;
        if (!trackingMongoId) {
            M.toast({
                html: 'Please select a tracking to add history to.',
                classes: 'red darken-2'
            });
            return;
        }

        const newLocation = document.getElementById('historyLocation').value;
        const newStatus = document.getElementById('historyStatus').value;
        const newDate = document.getElementById('historyDate').value;
        const newTime = document.getElementById('historyTime').value;
        const newDescription = document.getElementById('historyDescription').value;

        if (!newLocation || !newStatus || !newDate || !newTime) {
            M.toast({
                html: 'Please fill in all history fields.',
                classes: 'red darken-2'
            });
            return;
        }

        const historyEntry = {
            location: newLocation,
            status: newStatus,
            timestamp: `${newDate} ${newTime}`,
            description: newDescription
        };

        fetch(`/api/admin/trackings/${trackingMongoId}/history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(historyEntry)
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
                        throw new Error(errorData.message || 'Server error adding tracking history');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({
                        html: 'Tracking history added successfully!',
                        classes: 'green darken-2'
                    });
                    document.getElementById('historyLocation').value = '';
                    document.getElementById('historyStatus').value = '';
                    document.getElementById('historyDate').value = '';
                    document.getElementById('historyTime').value = '';
                    document.getElementById('historyDescription').value = '';
                    M.updateTextFields();
                    M.FormSelect.init(document.querySelectorAll('#addHistoryModal select')); // Re-init selects
                    fetchTrackingDetails(trackingMongoId); // Refresh history list
                } else {
                    M.toast({
                        html: `Error: ${data.message || 'Could not add tracking history.'}`,
                        classes: 'red darken-2'
                    });
                }
            })
            .catch(error => {
                console.error('Error adding tracking history:', error);
                M.toast({
                    html: `Network error or server issue: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    });

    function renderTrackingHistory(history) {
        trackingHistoryList.innerHTML = '';
        if (history && history.length > 0) {
            history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).forEach(entry => {
                const li = document.createElement('li');
                li.classList.add('collection-item');
                li.innerHTML = `
                    <div>
                        <strong>${new Date(entry.timestamp).toLocaleString()}:</strong> ${entry.status} at ${entry.location}
                        <p>${entry.description || ''}</p>
                        <a href="#!" class="secondary-content delete-history-trigger" data-history-id="${entry._id}">
                            <i class="material-icons red-text">delete</i>
                        </a>
                    </div>
                `;
                trackingHistoryList.appendChild(li);
            });

            document.querySelectorAll('.delete-history-trigger').forEach(trigger => {
                trigger.addEventListener('click', function() {
                    const historyId = this.dataset.historyId;
                    historyIdToDeleteInput.value = historyId;
                    M.Modal.getInstance(deleteHistoryModalTrigger).open();
                });
            });

        } else {
            trackingHistoryList.innerHTML = '<li class="collection-item">No tracking history available.</li>';
        }
    }

    // Delete Tracking History
    deleteTrackingHistoryBtn.addEventListener('click', function() {
        const trackingMongoId = document.getElementById('trackingMongoId').value;
        const historyId = historyIdToDeleteInput.value;

        if (!trackingMongoId || !historyId) {
            M.toast({
                html: 'Error: Missing tracking ID or history ID for deletion.',
                classes: 'red darken-2'
            });
            return;
        }

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
                        throw new Error(errorData.message || 'Server error deleting tracking history');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({
                        html: 'History entry deleted successfully!',
                        classes: 'red darken-2'
                    });
                    M.Modal.getInstance(deleteHistoryModalTrigger).close();
                    fetchTrackingDetails(trackingMongoId); // Refresh history list
                } else {
                    M.toast({
                        html: `Error: ${data.message || 'Could not delete history entry.'}`,
                        classes: 'red darken-2'
                    });
                }
            })
            .catch(error => {
                console.error('Error deleting tracking history:', error);
                M.toast({
                    html: `Network error or server issue: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    });

    // Render Package Files
    function renderPackageFiles(files) {
        packageFilesList.innerHTML = '';
        if (files && files.length > 0) {
            files.forEach(file => {
                const li = document.createElement('li');
                li.classList.add('collection-item');
                li.innerHTML = `
                    <div>
                        <a href="${file.url}" target="_blank" class="blue-text text-darken-2">
                            <i class="material-icons left">insert_drive_file</i>${file.fileName}
                        </a>
                        <a href="#!" class="secondary-content delete-file-trigger" data-file-id="${file._id}">
                            <i class="material-icons red-text">delete</i>
                        </a>
                    </div>
                `;
                packageFilesList.appendChild(li);
            });

            document.querySelectorAll('.delete-file-trigger').forEach(trigger => {
                trigger.addEventListener('click', function() {
                    const fileId = this.dataset.fileId;
                    fileIdToDeleteInput.value = fileId;
                    M.Modal.getInstance(deleteFileModalTrigger).open();
                });
            });
        } else {
            packageFilesList.innerHTML = '<li class="collection-item">No package files attached.</li>';
        }
    }

    // Delete Package File
    deletePackageFileBtn.addEventListener('click', function() {
        const trackingMongoId = document.getElementById('trackingMongoId').value;
        const fileId = fileIdToDeleteInput.value;

        if (!trackingMongoId || !fileId) {
            M.toast({
                html: 'Error: Missing tracking ID or file ID for deletion.',
                classes: 'red darken-2'
            });
            return;
        }

        fetch(`/api/admin/trackings/${trackingMongoId}/files/${fileId}`, {
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
                        throw new Error(errorData.message || 'Server error deleting package file');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({
                        html: 'File deleted successfully!',
                        classes: 'red darken-2'
                    });
                    M.Modal.getInstance(deleteFileModalTrigger).close();
                    fetchTrackingDetails(trackingMongoId); // Refresh files list
                } else {
                    M.toast({
                        html: `Error: ${data.message || 'Could not delete file.'}`,
                        classes: 'red darken-2'
                    });
                }
            })
            .catch(error => {
                console.error('Error deleting package file:', error);
                M.toast({
                    html: `Network error or server issue: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    });


    // --- 3. Manage All Trackings Table --- (Your provided code starts here)
    const trackingTableBody = document.getElementById('all-trackings-table-body');

    function fetchAllTrackings() {
        trackingTableBody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 20px;"><div class="preloader-wrapper active"><div class="spinner-layer spinner-blue-only"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div><p>Loading tracking data...</p></td></tr>';

        fetch('/api/admin/trackings', { // <--- CORRECTED URL: Added '/admin'
                method: 'GET',
                headers: { // <--- ADD THIS LINE!
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // <--- ADD THIS LINE!
                } // <--- ADD THIS LINE!
            })
            .then(response => {
                if (!response.ok) { // Improved error handling
                    if (response.status === 401 || response.status === 403) {
                        M.toast({
                            html: 'Session expired or unauthorized. Please log in again.',
                            classes: 'red darken-2'
                        });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error fetching all trackings');
                    });
                }
                return response.json();
            })
            .then(trackings => {
                renderTrackingsTable(trackings);
                updateDashboardStats(trackings); // Update dashboard stats here
            })
            .catch(error => {
                console.error('Error fetching all trackings:', error);
                trackingTableBody.innerHTML = `<tr><td colspan="12" style="text-align: center; padding: 20px; color: red;">Failed to load tracking data: ${error.message}.</td></tr>`;
                M.toast({
                    html: `Failed to load all trackings: ${error.message}`,
                    classes: 'red darken-2'
                }); // Toast for user
            });
    }

    function renderTrackingsTable(trackings) {
        trackingTableBody.innerHTML = ''; // Clear existing rows
        if (trackings.length === 0) {
            trackingTableBody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 20px;">No tracking data available.</td></tr>';
            return;
        }

        trackings.forEach(tracking => {
            const row = document.createElement('tr');
            const statusColor = getStatusColorClass(tracking.status);
            const blinkingClass = tracking.isBlinking ? 'blinking' : '';
            const lastUpdated = tracking.updatedAt ? new Date(tracking.updatedAt).toLocaleString() : 'N/A';
            const expectedDelivery = (tracking.expectedDeliveryDate || 'N/A') + (tracking.expectedDeliveryTime ? ` at ${tracking.expectedDeliveryTime}` : '');

            row.innerHTML = `
                <td>${tracking.trackingId}</td>
                <td>
                    <span class="status-circle ${statusColor} ${blinkingClass}" style="background-color: ${statusColor === 'unknown' ? '#9e9e9e' : ''};"></span>
                    ${tracking.status}
                </td>
                <td>
                    <div style="width: 20px; height: 20px; border-radius: 50%; background-color: ${tracking.statusLineColor || '#2196F3'}; display: inline-block; vertical-align: middle; margin-right: 5px;"></div>
                    ${tracking.statusLineColor || '#2196F3'}
                </td>
                <td>${tracking.isBlinking ? 'Yes' : 'No'}</td>
                <td>${tracking.senderName}</td>
                <td>${tracking.recipientName}</td>
                <td>${tracking.packageContents}</td>
                <td>${tracking.serviceType}</td>
                <td>${tracking.recipientAddress}</td>
                <td>${tracking.specialHandling || 'N/A'}</td>
                <td>${expectedDelivery}</td>
                <td>${lastUpdated}</td>
                <td>
                    <button class="btn-small waves-effect waves-light blue darken-2 view-edit-btn" data-id="${tracking._id}">
                        <i class="fas fa-eye"></i> View/Edit
                    </button>
                    <button class="btn-small waves-effect waves-light red darken-2 delete-tracking-btn" data-id="${tracking._id}">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </td>
            `;
            trackingTableBody.appendChild(row);
        });

        // Attach event listeners to new buttons
        document.querySelectorAll('.view-edit-btn').forEach(button => {
            button.addEventListener('click', function() {
                const trackingMongoId = this.dataset.id;
                // Find the option in the select dropdown and simulate change
                singleTrackingIdSelect.value = trackingMongoId;
                M.FormSelect.init(singleTrackingIdSelect); // Re-init to update visual
                singleTrackingIdSelect.dispatchEvent(new Event('change')); // Trigger change to load form
                showSection('manage-tracking-section'); // Switch to manage section
            });
        });
        document.querySelectorAll('.delete-tracking-btn').forEach(button => {
            button.addEventListener('click', deleteTracking);
        });
    }

    function deleteTracking(e) {
        const trackingMongoId = e.currentTarget.dataset.id;
        if (confirm('Are you sure you want to delete this tracking entry? This action cannot be undone.')) {
            fetch(`/api/admin/trackings/${trackingMongoId}`, { // <--- CORRECTED URL: Added '/admin'
                    method: 'DELETE',
                    headers: { // <--- ADD THIS LINE!
                        'Authorization': `Bearer ${localStorage.getItem('token')}` // <--- ADD THIS LINE!
                    } // <--- ADD THIS LINE!
                })
                .then(response => {
                    if (!response.ok) { // Improved error handling
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
                            classes: 'red darken-2'
                        });
                        fetchAllTrackings(); // Refresh the table
                        fetchTrackingIdsForSelect(); // Refresh single tracking dropdown
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
    }


    // --- Communication Center Logic ---
    const emailTrackingIdSelect = document.getElementById('emailTrackingIdSelect');
    const notificationEmailInput = document.getElementById('notificationEmail');
    const emailSubjectInput = document.getElementById('emailSubject');
    const notificationMessageInput = document.getElementById('notificationMessage');
    const emailAttachmentFileUpload = document.getElementById('emailAttachmentFileUpload');

    function fetchTrackingIdsForEmailSelect() {
        fetch('/api/admin/trackings', { // <--- CORRECTED URL: Added '/admin'
                method: 'GET',
                headers: { // <--- ADD THIS LINE!
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // <--- ADD THIS LINE!
                } // <--- ADD THIS LINE!
            })
            .then(response => {
                if (!response.ok) { // Improved error handling
                    if (response.status === 401 || response.status === 403) {
                        M.toast({
                            html: 'Session expired or unauthorized. Please log in again.',
                            classes: 'red darken-2'
                        });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error fetching tracking IDs for email');
                    });
                }
                return response.json();
            })
            .then(trackings => {
                emailTrackingIdSelect.innerHTML = '<option value="" disabled selected>Select Tracking ID (Optional, for pre-filling email)</option>';
                trackings.forEach(tracking => {
                    const option = document.createElement('option');
                    option.value = tracking._id; // Use MongoDB _id
                    option.textContent = tracking.trackingId; // Display trackingId
                    option.dataset.recipientEmail = tracking.recipientEmail || ''; // Store recipient email
                    emailTrackingIdSelect.appendChild(option);
                });
                M.FormSelect.init(emailTrackingIdSelect); // Re-initialize Materialize select
            })
            .catch(error => {
                console.error('Error fetching tracking IDs for email:', error);
                M.toast({
                    html: `Error fetching email tracking IDs: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    }

    emailTrackingIdSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        if (selectedOption.value) {
            notificationEmailInput.value = selectedOption.dataset.recipientEmail;
            M.updateTextFields(); // Ensure label floats for pre-filled email
        } else {
            notificationEmailInput.value = '';
            M.updateTextFields();
        }
    });

    document.getElementById('sendEmailForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const recipientEmail = notificationEmailInput.value;
        const emailSubject = emailSubjectInput.value;
        const userMessage = notificationMessageInput.value; // User's custom message
        const selectedTrackingId = emailTrackingIdSelect.options[emailTrackingIdSelect.selectedIndex].textContent;

        if (!recipientEmail || !emailSubject || !userMessage) {
            M.toast({
                html: 'Please fill in all required email fields (Recipient, Subject, Message).',
                classes: 'red darken-2'
            });
            return;
        }

        // Construct the HTML email body
        const emailHtmlBody = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${emailSubject}</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: #f4f4f4;
                        color: #333;
                    }
                    .email-container {
                        max-width: 600px;
                        margin: 20px auto;
                        background-color: #ffffff;
                        border-radius: 10px;
                        overflow: hidden;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        background: linear-gradient(135deg, #8A2BE2, #FF4500); /* Purple and Orange */
                        color: #ffffff;
                        padding: 20px;
                        text-align: center;
                        font-size: 24px;
                        font-weight: bold;
                        text-shadow: 0 0 10px rgba(255, 255, 255, 0.7); /* Glowing white effect */
                    }
                    .content {
                        padding: 30px;
                        line-height: 1.6;
                    }
                    .content p {
                        margin-bottom: 15px;
                    }
                    .highlight {
                        color: #8A2BE2; /* Purple */
                        font-weight: bold;
                    }
                    .tracking-info {
                        background-color: #f9f9f9;
                        border-left: 5px solid #FF4500; /* Orange accent */
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 5px;
                    }
                    .tracking-info strong {
                        color: #FF4500; /* Orange */
                    }
                    .footer {
                        background-color: #333;
                        color: #ffffff;
                        text-align: center;
                        padding: 20px;
                        font-size: 12px;
                    }
                    .footer a {
                        color: #ffffff;
                        text-decoration: none;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        Tracking Update Notification
                    </div>
                    <div class="content">
                        <p>Dear Customer,</p>
                        <p>We have an important update regarding your recent shipment.</p>
                        <p>${userMessage.replace(/\n/g, '<br>')}</p> ${selectedTrackingId && selectedTrackingId !== "Select Tracking ID (Optional, for pre-filling email)" ?
                            `<div class="tracking-info">
                                <strong>Tracking ID:</strong> <span class="highlight">${selectedTrackingId}</span>
                                <p>You can track your package anytime by visiting our website and entering this ID.</p>
                            </div>`
                            : ''}
                        <p>Thank you for choosing our service.</p>
                        <p>Sincerely,<br>The Admin Team</p>
                    </div>
                    <div class="footer">
                        &copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.<br>
                        <a href="mailto:support@yourcompany.com" style="color: #ffffff;">support@yourcompany.com</a>
                    </div>
                </div>
            </body>
            </html>
        `;

        const formData = new FormData();
        formData.append('to', recipientEmail);
        formData.append('subject', emailSubject);
        formData.append('message', emailHtmlBody); // Send HTML content

        if (emailAttachmentFileUpload.files.length > 0) {
            formData.append('attachment', emailAttachmentFileUpload.files[0]);
        }

        fetch('/api/admin/send-email', { // <--- CORRECTED URL: Added '/admin'
                method: 'POST',
                headers: { // <--- ADDED HEADERS BLOCK
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // <--- ADDED AUTHORIZATION
                    // 'Content-Type': 'multipart/form-data' is set automatically by FormData
                }, // <--- END HEADERS BLOCK
                body: formData, // FormData will set the correct Content-Type automatically
            })
            .then(response => {
                if (!response.ok) { // Improved error handling
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
                        classes: 'light-blue darken-1'
                    });
                    document.getElementById('sendEmailForm').reset();
                    M.updateTextFields();
                    // Clear file input path visually
                    const filePathInput = document.querySelector('#emailAttachmentFileUpload + .file-path-wrapper .file-path');
                    if (filePathInput) filePathInput.value = '';
                } else {
                    M.toast({
                        html: `Error sending email: ${data.message || 'Unknown error.'}`,
                        classes: 'red darken-2'
                    });
                }
            })
            .catch(error => {
                console.error('Error sending email:', error);
                M.toast({
                    html: `Network error or server issue while sending email: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    });

    // --- Package File Upload Logic ---
    const attachFileTrackingIdSelect = document.getElementById('attachFileTrackingIdSelect');
    const packageFileInput = document.getElementById('packageFileInput');

    // Populate tracking IDs for file attachment
    function fetchTrackingIdsForAttachFileSelect() {
        fetch('/api/admin/trackings', { // <--- CORRECTED URL: Added '/admin'
                method: 'GET',
                headers: { // <--- ADD THIS LINE!
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // <--- ADD THIS LINE!
                } // <--- ADD THIS LINE!
            })
            .then(response => {
                if (!response.ok) { // Improved error handling
                    if (response.status === 401 || response.status === 403) {
                        M.toast({
                            html: 'Session expired or unauthorized. Please log in again.',
                            classes: 'red darken-2'
                        });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error fetching tracking IDs for file attachment');
                    });
                }
                return response.json();
            })
            .then(trackings => {
                attachFileTrackingIdSelect.innerHTML = '<option value="" disabled selected>Select Tracking ID</option>';
                trackings.forEach(tracking => {
                    const option = document.createElement('option');
                    option.value = tracking._id; // Use MongoDB _id for linking
                    option.textContent = tracking.trackingId; // Display trackingId to user
                    attachFileTrackingIdSelect.appendChild(option);
                });
                M.FormSelect.init(attachFileTrackingIdSelect); // Re-initialize Materialize select
            })
            .catch(error => {
                console.error('Error fetching tracking IDs for file attachment:', error);
                M.toast({
                    html: `Error fetching file attachment IDs: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    }


    document.getElementById('uploadPackageFileForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const selectedTrackingMongoId = attachFileTrackingIdSelect.value;
        if (!selectedTrackingMongoId) {
            M.toast({
                html: 'Please select a tracking ID to link the file to.',
                classes: 'red darken-2'
            });
            return;
        }

        if (packageFileInput.files.length === 0) {
            M.toast({
                html: 'Please select a file to upload.',
                classes: 'red darken-2'
            });
            return;
        }

        const file = packageFileInput.files[0];
        const formData = new FormData();
        formData.append('packageFile', file);
        formData.append('trackingId', selectedTrackingMongoId); // Send MongoDB _id

        fetch('/api/admin/upload-package-file', { // <--- CORRECTED URL: Added '/admin'
                method: 'POST',
                headers: { // <--- ADDED HEADERS BLOCK
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // <--- ADDED AUTHORIZATION
                    // 'Content-Type': 'multipart/form-data' is set automatically by FormData
                }, // <--- END HEADERS BLOCK
                body: formData,
            })
            .then(response => {
                if (!response.ok) { // Improved error handling
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
                        html: 'Package file uploaded and linked successfully!',
                        classes: 'green'
                    });
                    document.getElementById('uploadPackageFileForm').reset();
                    // Clear file input path visually
                    const filePathInput = document.querySelector('#packageFileInput + .file-path-wrapper .file-path');
                    if (filePathInput) filePathInput.value = '';
                    M.FormSelect.init(attachFileTrackingIdSelect); // Reset select if needed
                } else {
                    M.toast({
                        html: `Error uploading file: ${data.message || 'Unknown error.'}`,
                        classes: 'red darken-2'
                    });
                }
            })
            .catch(error => {
                console.error('Error uploading package file:', error);
                M.toast({
                    html: `Network error or server issue during file upload: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    });

    // --- 4. Manage Users Table ---
    const usersTableBody = document.getElementById('users-table-body');
    const createUserModal = document.getElementById('createUserModal');
    const createUserForm = document.getElementById('createUserForm');
    const editUserModal = document.getElementById('editUserModal');
    const editUserForm = document.getElementById('editUserForm');
    const deleteUserModalTrigger = document.getElementById('deleteUserModalTrigger');
    const deleteUserBtn = document.getElementById('deleteUserBtn');
    const userIdToDeleteInput = document.getElementById('userIdToDelete');

    function fetchAllUsers() {
        usersTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;"><div class="preloader-wrapper active"><div class="spinner-layer spinner-blue-only"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div><p>Loading user data...</p></td></tr>';

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
                renderUsersTable(users);
            })
            .catch(error => {
                console.error('Error fetching users:', error);
                usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: red;">Failed to load user data: ${error.message}.</td></tr>`;
                M.toast({
                    html: `Failed to load users: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    }

    function renderUsersTable(users) {
        usersTableBody.innerHTML = '';
        if (users.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No user data available.</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${new Date(user.createdAt).toLocaleString()}</td>
                <td>
                    <button class="btn-small waves-effect waves-light green darken-2 edit-user-btn" data-id="${user._id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-small waves-effect waves-light red darken-2 delete-user-btn" data-id="${user._id}">
                        <i class="fas fa-user-times"></i> Delete
                    </button>
                </td>
            `;
            usersTableBody.appendChild(row);
        });

        document.querySelectorAll('.edit-user-btn').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.dataset.id;
                fetchUserDetails(userId);
            });
        });

        document.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.dataset.id;
                userIdToDeleteInput.value = userId;
                M.Modal.getInstance(deleteUserModalTrigger).open();
            });
        });
    }

    // Create User
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

    // Delete User
    deleteUserBtn.addEventListener('click', function() {
        const userId = userIdToDeleteInput.value;

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
                        throw new Error(errorData.message || 'Server error deleting user');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({
                        html: 'User deleted successfully!',
                        classes: 'red darken-2'
                    });
                    M.Modal.getInstance(deleteUserModalTrigger).close();
                    fetchAllUsers();
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


    // Dashboard Quick Stats Update (Your provided code continues here)
    function updateDashboardStats(trackings) {
        const total = trackings.length;
        const delivered = trackings.filter(t => t.status.toLowerCase().includes('delivered')).length;
        const inTransit = trackings.filter(t => t.status.toLowerCase().includes('in transit')).length;
        const pending = trackings.filter(t => t.status.toLowerCase().includes('pending') || t.status.toLowerCase().includes('on hold')).length;
        const exceptions = trackings.filter(t => t.status.toLowerCase().includes('exception') || t.status.toLowerCase().includes('delay')).length;

        document.getElementById('totalPackages').textContent = total;
        document.getElementById('deliveredPackages').textContent = delivered;
        document.getElementById('inTransitPackages').textContent = inTransit;
        document.getElementById('pendingPackages').textContent = pending;
        document.getElementById('exceptionsPackages').textContent = exceptions;
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
});