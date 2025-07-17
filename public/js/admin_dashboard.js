// admin_dashboard.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Materialize components
    M.Sidenav.init(document.querySelector('.sidenav'));
    M.FormSelect.init(document.querySelectorAll('select'));
    M.Modal.init(document.querySelectorAll('.modal'));
    M.Datepicker.init(document.querySelectorAll('.datepicker'));
    M.Timepicker.init(document.querySelectorAll('.timepicker'), {
        twelveHour: false
    });

    const editHistoryModal = document.getElementById('editHistoryModal');
    const editHistoryModalInstance = M.Modal.getInstance(editHistoryModal);


    // Section Management
    function showSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById(sectionId).style.display = 'block';

        // Specific actions on section change
        if (sectionId === 'manage-all-trackings-section') {
            fetchAllTrackings();
        } else if (sectionId === 'communication-center-section') {
            fetchTrackingIdsForEmailSelect();
        } else if (sectionId === 'package-file-upload-section') {
            fetchTrackingIdsForAttachFileSelect();
        }
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showSection(this.dataset.section);
        });
    });

    // Logout Functionality
    document.getElementById('logout-btn').addEventListener('click', function() {
        localStorage.removeItem('token');
        window.location.href = 'admin_login.html';
    });


    // 1. Create New Tracking Form
    const createTrackingForm = document.getElementById('createTrackingForm');

    createTrackingForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const newTracking = {
            trackingId: document.getElementById('createTrackingId').value,
            status: document.getElementById('createStatus').value,
            statusLineColor: document.getElementById('createStatusLineColor').value,
            isBlinking: document.getElementById('createIsBlinking').checked,
            senderName: document.getElementById('createSenderName').value,
            senderAddress: document.getElementById('createSenderAddress').value,
            senderEmail: document.getElementById('createSenderEmail').value,
            senderPhone: document.getElementById('createSenderPhone').value,
            recipientName: document.getElementById('createRecipientName').value,
            recipientAddress: document.getElementById('createRecipientAddress').value,
            recipientEmail: document.getElementById('createRecipientEmail').value,
            recipientPhone: document.getElementById('createRecipientPhone').value,
            packageContents: document.getElementById('createPackageContents').value,
            serviceType: document.getElementById('createServiceType').value,
            weight: document.getElementById('createWeight').value,
            dimensions: document.getElementById('createDimensions').value,
            origin: document.getElementById('createOrigin').value,
            destination: document.getElementById('createDestination').value,
            pickupDate: document.getElementById('createPickupDate').value,
            pickupTime: document.getElementById('createPickupTime').value,
            expectedDeliveryDate: document.getElementById('createExpectedDeliveryDate').value,
            expectedDeliveryTime: document.getElementById('createExpectedDeliveryTime').value,
            specialHandling: document.getElementById('createSpecialHandling').value,
            carrier: document.getElementById('createCarrier').value,
            currentLocation: document.getElementById('createCurrentLocation').value,
            customsStatus: document.getElementById('createCustomsStatus').value,
            // History will be empty initially or added separately
        };

        fetch('/api/admin/trackings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(newTracking),
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
                if (data.tracking) {
                    M.toast({
                        html: 'Tracking created successfully!',
                        classes: 'green'
                    });
                    createTrackingForm.reset();
                    M.updateTextFields(); // Update Materialize labels
                    M.FormSelect.init(document.querySelectorAll('select')); // Re-initialize selects
                    fetchTrackingIdsForSelect(); // Refresh tracking IDs in other sections
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


    // 2. Manage Single Tracking Details
    const singleTrackingIdSelect = document.getElementById('singleTrackingIdSelect');
    const trackingDetailsForm = document.getElementById('trackingDetailsForm');
    const historyEventsContainer = document.getElementById('historyEvents');
    const addHistoryForm = document.getElementById('addHistoryForm');
    const updateTrackingBtn = document.getElementById('updateTrackingBtn');
    const addHistoryBtn = document.getElementById('addHistoryBtn');


    // Populate Tracking IDs for Select
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
                    option.value = tracking._id; // Use MongoDB _id as the value
                    option.textContent = tracking.trackingId; // Display trackingId to user
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

    // Load Tracking Details when a tracking ID is selected
    singleTrackingIdSelect.addEventListener('change', function() {
        const trackingMongoId = this.value;
        if (trackingMongoId) {
            loadTrackingDetails(trackingMongoId);
        } else {
            trackingDetailsForm.reset();
            historyEventsContainer.innerHTML = '<li class="collection-item">No tracking selected.</li>';
            updateTrackingBtn.disabled = true;
            addHistoryBtn.disabled = true;
        }
    });

    function loadTrackingDetails(trackingMongoId) {
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
                document.getElementById('editTrackingId').value = tracking.trackingId;
                document.getElementById('editStatus').value = tracking.status;
                document.getElementById('editStatusLineColor').value = tracking.statusLineColor;
                document.getElementById('editIsBlinking').checked = tracking.isBlinking;
                document.getElementById('editSenderName').value = tracking.senderName;
                document.getElementById('editSenderAddress').value = tracking.senderAddress;
                document.getElementById('editSenderEmail').value = tracking.senderEmail;
                document.getElementById('editSenderPhone').value = tracking.senderPhone;
                document.getElementById('editRecipientName').value = tracking.recipientName;
                document.getElementById('editRecipientAddress').value = tracking.recipientAddress;
                document.getElementById('editRecipientEmail').value = tracking.recipientEmail;
                document.getElementById('editRecipientPhone').value = tracking.recipientPhone;
                document.getElementById('editPackageContents').value = tracking.packageContents;
                document.getElementById('editServiceType').value = tracking.serviceType;
                document.getElementById('editWeight').value = tracking.weight;
                document.getElementById('editDimensions').value = tracking.dimensions;
                document.getElementById('editOrigin').value = tracking.origin;
                document.getElementById('editDestination').value = tracking.destination;
                document.getElementById('editPickupDate').value = tracking.pickupDate;
                document.getElementById('editPickupTime').value = tracking.pickupTime;
                document.getElementById('editExpectedDeliveryDate').value = tracking.expectedDeliveryDate;
                document.getElementById('editExpectedDeliveryTime').value = tracking.expectedDeliveryTime;
                document.getElementById('editSpecialHandling').value = tracking.specialHandling;
                document.getElementById('editCarrier').value = tracking.carrier;
                document.getElementById('editCurrentLocation').value = tracking.currentLocation;
                document.getElementById('editCustomsStatus').value = tracking.customsStatus;


                M.updateTextFields(); // Update Materialize labels for pre-filled inputs
                M.FormSelect.init(document.querySelectorAll('select')); // Re-initialize selects
                updateTrackingBtn.disabled = false;
                addHistoryBtn.disabled = false;

                renderHistoryEvents(tracking.history || []);
            })
            .catch(error => {
                console.error('Error loading tracking details:', error);
                M.toast({
                    html: `Failed to load tracking details: ${error.message}`,
                    classes: 'red darken-2'
                });
                trackingDetailsForm.reset();
                historyEventsContainer.innerHTML = '<li class="collection-item">Error loading history.</li>';
                updateTrackingBtn.disabled = true;
                addHistoryBtn.disabled = true;
            });
    }

    // Update Tracking Form Submission
    trackingDetailsForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const trackingMongoId = singleTrackingIdSelect.value;
        if (!trackingMongoId) {
            M.toast({
                html: 'Please select a tracking ID to update.',
                classes: 'red darken-2'
            });
            return;
        }

        const updatedTracking = {
            trackingId: document.getElementById('editTrackingId').value,
            status: document.getElementById('editStatus').value,
            statusLineColor: document.getElementById('editStatusLineColor').value,
            isBlinking: document.getElementById('editIsBlinking').checked,
            senderName: document.getElementById('editSenderName').value,
            senderAddress: document.getElementById('editSenderAddress').value,
            senderEmail: document.getElementById('editSenderEmail').value,
            senderPhone: document.getElementById('editSenderPhone').value,
            recipientName: document.getElementById('editRecipientName').value,
            recipientAddress: document.getElementById('editRecipientAddress').value,
            recipientEmail: document.getElementById('editRecipientEmail').value,
            recipientPhone: document.getElementById('editRecipientPhone').value,
            packageContents: document.getElementById('editPackageContents').value,
            serviceType: document.getElementById('editServiceType').value,
            weight: document.getElementById('editWeight').value,
            dimensions: document.getElementById('editDimensions').value,
            origin: document.getElementById('editOrigin').value,
            destination: document.getElementById('editDestination').value,
            pickupDate: document.getElementById('editPickupDate').value,
            pickupTime: document.getElementById('editPickupTime').value,
            expectedDeliveryDate: document.getElementById('editExpectedDeliveryDate').value,
            expectedDeliveryTime: document.getElementById('editExpectedDeliveryTime').value,
            specialHandling: document.getElementById('editSpecialHandling').value,
            carrier: document.getElementById('editCarrier').value,
            currentLocation: document.getElementById('editCurrentLocation').value,
            customsStatus: document.getElementById('editCustomsStatus').value,
        };

        fetch(`/api/admin/trackings/${trackingMongoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updatedTracking),
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
                if (data.tracking) {
                    M.toast({
                        html: 'Tracking updated successfully!',
                        classes: 'blue'
                    });
                    // Re-load details to ensure all fields and history are fresh
                    loadTrackingDetails(trackingMongoId);
                    fetchAllTrackings(); // Refresh the main table
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

    // Render History Events
    function renderHistoryEvents(history) {
        historyEventsContainer.innerHTML = '';
        if (history.length === 0) {
            historyEventsContainer.innerHTML = '<li class="collection-item">No history events for this tracking.</li>';
            return;
        }

        history.forEach((event, index) => {
            const li = document.createElement('li');
            li.className = 'collection-item';
            const eventDate = event.date ? new Date(event.date).toLocaleString() : 'N/A';
            li.innerHTML = `
                <div>
                    <strong>Date:</strong> ${eventDate}<br>
                    <strong>Location:</strong> ${event.location}<br>
                    <strong>Status:</strong> ${event.status}<br>
                    <strong>Description:</strong> ${event.description || 'N/A'}
                    <div class="secondary-content">
                        <button class="btn-small waves-effect waves-light blue edit-history-btn"
                                data-id="${event._id}"
                                data-location="${event.location}"
                                data-status="${event.status}"
                                data-description="${event.description || ''}"
                                data-date="${event.date ? new Date(event.date).toISOString().substring(0, 16) : ''}"
                        >
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-small waves-effect waves-light red delete-history-btn"
                                data-id="${event._id}" data-index="${index}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            historyEventsContainer.appendChild(li);
        });

        document.querySelectorAll('.edit-history-btn').forEach(button => {
            button.addEventListener('click', openEditHistoryModal);
        });

        document.querySelectorAll('.delete-history-btn').forEach(button => {
            button.addEventListener('click', deleteHistoryEvent);
        });
    }


    // Add History Event
    addHistoryForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const trackingMongoId = singleTrackingIdSelect.value;
        if (!trackingMongoId) {
            M.toast({
                html: 'Please select a tracking ID first.',
                classes: 'red darken-2'
            });
            return;
        }

        const newHistoryEvent = {
            date: document.getElementById('addHistoryDate').value,
            location: document.getElementById('addHistoryLocation').value,
            status: document.getElementById('addHistoryStatus').value,
            description: document.getElementById('addHistoryDescription').value,
        };

        fetch(`/api/admin/trackings/${trackingMongoId}/history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(newHistoryEvent),
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
                if (data.tracking) { // Assuming a successful response returns the updated tracking object
                    M.toast({
                        html: 'History event added!',
                        classes: 'green'
                    });
                    addHistoryForm.reset();
                    M.updateTextFields(); // Update Materialize labels
                    loadTrackingDetails(trackingMongoId); // Refresh current tracking's history
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

    // Edit History Modal Logic
    function openEditHistoryModal(e) {
        const btn = e.currentTarget;
        document.getElementById('editHistoryId').value = btn.dataset.id;
        document.getElementById('editHistoryLocationModal').value = btn.dataset.location;
        document.getElementById('editHistoryStatusModal').value = btn.dataset.status;
        document.getElementById('editHistoryDescriptionModal').value = btn.dataset.description;
        document.getElementById('editHistoryDateModal').value = btn.dataset.date.substring(0, 10); // Date part
        document.getElementById('editHistoryTimeModal').value = btn.dataset.date.substring(11, 16); // Time part

        M.updateTextFields();
        M.FormSelect.init(document.getElementById('editHistoryStatusModal')); // Re-init select

        editHistoryModalInstance.open();
    }

    document.getElementById('editHistoryForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const trackingMongoId = document.getElementById('singleTrackingIdSelect').value;
        const historyId = document.getElementById('editHistoryId').value;

        if (!trackingMongoId || !historyId) {
            M.toast({
                html: 'Missing tracking or history ID for update.',
                classes: 'red darken-2'
            });
            return;
        }

        const updatedHistoryEvent = {
            date: document.getElementById('editHistoryDateModal').value + 'T' + document.getElementById('editHistoryTimeModal').value,
            location: document.getElementById('editHistoryLocationModal').value,
            status: document.getElementById('editHistoryStatusModal').value,
            description: document.getElementById('editHistoryDescriptionModal').value,
        };

        fetch(`/api/admin/trackings/${trackingMongoId}/history/${historyId}`, { // <--- CORRECTED URL: Added '/admin'
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // <--- ADD THIS LINE!
                },
                body: JSON.stringify(updatedHistoryEvent),
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
                        throw new Error(errorData.message || 'Server error updating history event');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.tracking) { // Assuming a successful response returns the updated tracking object
                    M.toast({
                        html: 'History event updated!',
                        classes: 'blue'
                    });
                    // Refresh current tracking's history
                    loadTrackingDetails(trackingMongoId); // Use the new function to refresh the details
                    editHistoryModalInstance.close(); // Close modal on success
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

    // Delete History Event
    function deleteHistoryEvent(e) {
        const btn = e.currentTarget;
        const trackingMongoId = document.getElementById('singleTrackingIdSelect').value;
        const historyId = btn.dataset.id; // Use history event's MongoDB _id
        const historyIndex = btn.dataset.index; // Fallback to index if no _id (less reliable)

        if (!trackingMongoId) {
            M.toast({
                html: 'Please select a tracking ID first.',
                classes: 'red darken-2'
            });
            return;
        }

        if (confirm('Are you sure you want to delete this history event?')) {
            fetch(`/api/admin/trackings/${trackingMongoId}/history/${historyId || historyIndex}`, { // <--- CORRECTED URL: Added '/admin'
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
                            throw new Error(errorData.message || 'Server error deleting history event');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.tracking) { // Assuming success returns the updated tracking object
                        M.toast({
                            html: 'History event deleted!',
                            classes: 'red darken-2'
                        });
                        // Refresh current tracking's history
                        loadTrackingDetails(trackingMongoId); // Use the new function to refresh the details
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
    }


    // 3. Manage All Trackings Table
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


    // Communication Center Logic
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
                        <a href="mailto:support@yourcompany.com" style="color: #ffffff;">support@yourcompany.com">support@yourcompany.com</a>
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

    // Package File Upload Logic
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


    // Dashboard Quick Stats Update
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