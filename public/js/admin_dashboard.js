document.addEventListener('DOMContentLoaded', function() {
    // Initialize Materialize Components
    M.Sidenav.init(document.querySelectorAll('.sidenav'));
    M.Modal.init(document.querySelectorAll('.modal'));
    M.FormSelect.init(document.querySelectorAll('select'));
    M.Datepicker.init(document.querySelectorAll('.datepicker'));
    M.Timepicker.init(document.querySelectorAll('.timepicker'));
    M.CharacterCounter.init(document.querySelectorAll('input, textarea'));
    M.Tooltip.init(document.querySelectorAll('.tooltipped')); // Initialize tooltips

    // --- Utility Functions ---
    function showSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('hidden');
        });
        document.getElementById(sectionId).classList.remove('hidden');

        // Update active class in sidebar
        document.querySelectorAll('.sidenav li').forEach(item => {
            item.classList.remove('active');
        });
        const activeLink = document.querySelector(`.sidenav a[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.parentElement.classList.add('active');
        }

        // Re-initialize Materialize components for the shown section if necessary
        M.FormSelect.init(document.querySelectorAll(`#${sectionId} select`));
        M.Datepicker.init(document.querySelectorAll(`#${sectionId} .datepicker`));
        M.Timepicker.init(document.querySelectorAll(`#${sectionId} .timepicker`));
        M.updateTextFields(); // Important for correctly displaying pre-filled form fields
    }

    // Attach click listeners for sidebar navigation
    document.querySelectorAll('.sidenav a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('href').substring(1);
            showSection(sectionId);

            // Fetch data relevant to the section being shown
            if (sectionId === 'dashboard-section') {
                fetchAllTrackings();
            } else if (sectionId === 'create-tracking-section') {
                // No specific fetch needed for create form, but clear if populated
            } else if (sectionId === 'manage-tracking-section') {
                fetchTrackingIdsForSelect(); // Populate the dropdown for managing single trackings
            } else if (sectionId === 'communications-section') {
                fetchTrackingIdsForEmailSelect(); // Populate tracking IDs for email
            } else if (sectionId === 'file-upload-section') {
                fetchTrackingIdsForAttachFileSelect(); // Populate tracking IDs for file attachment
            } else if (sectionId === 'manage-users-section') {
                fetchAllUsers();
            } else if (sectionId === 'settings-section') {
                // Future settings loading
            }
        });
    });

    // --- Logout Logic ---
        document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('token');
        M.toast({
            html: 'Logged out successfully!',
            classes: 'blue darken-1'
        });
        setTimeout(() => window.location.href = 'admin_login.html', 1000);
    });

    // --- 1. Create New Tracking Form ---
    const createTrackingForm = document.getElementById('createTrackingForm');

    createTrackingForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const newTrackingData = {
            trackingId: document.getElementById('newTrackingId').value,
            status: document.getElementById('newStatus').value,
            statusLineColor: document.getElementById('newStatusLineColor').value,
            isBlinking: document.getElementById('newIsBlinking').checked,
            senderName: document.getElementById('newSenderName').value,
            senderAddress: document.getElementById('newSenderAddress').value,
            senderPhone: document.getElementById('newSenderPhone').value,
            recipientName: document.getElementById('newRecipientName').value,
            recipientEmail: document.getElementById('newRecipientEmail').value,
            recipientAddress: document.getElementById('newRecipientAddress').value,
            recipientPhone: document.getElementById('newRecipientPhone').value,
            packageContents: document.getElementById('newPackageContents').value,
            serviceType: document.getElementById('newServiceType').value,
            currentLocation: document.getElementById('newCurrentLocation').value,
            eta: document.getElementById('newETA').value, // This is likely a date
            expectedDeliveryDate: document.getElementById('newExpectedDeliveryDate').value,
            expectedDeliveryTime: document.getElementById('newExpectedDeliveryTime').value,
            specialHandling: document.getElementById('newSpecialHandling').value,
            notes: document.getElementById('newNotes').value
        };

        // Client-side validation example (can be expanded)
        if (!newTrackingData.trackingId || !newTrackingData.status || !newTrackingData.recipientName || !newTrackingData.recipientAddress) {
            M.toast({
                html: 'Please fill in required fields: Tracking ID, Status, Recipient Name, Recipient Address.',
                classes: 'red darken-2'
            });
            return;
        }

        fetch('/api/admin/trackings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(newTrackingData)
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
                    createTrackingForm.reset();
                    M.updateTextFields(); // Reset Materialize text field states
                    M.FormSelect.init(document.querySelectorAll('#createTrackingForm select')); // Re-init selects
                    // Optionally, navigate to manage trackings or refresh dashboard stats
                    fetchAllTrackings();
                    fetchTrackingIdsForSelect(); // Update the dropdown for single tracking management
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

    // --- 2. Manage Single Tracking Form ---
    const singleTrackingIdSelect = document.getElementById('singleTrackingId');
    const manageTrackingForm = document.getElementById('manageTrackingForm');
    const deleteSingleTrackingBtn = document.getElementById('deleteSingleTrackingBtn');

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
        const selectedId = this.value; // This is the MongoDB _id
        if (selectedId) {
            fetch(`/api/admin/trackings/${selectedId}`, {
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
                            throw new Error(errorData.message || 'Server error fetching single tracking');
                        });
                    }
                    return response.json();
                })
                .then(tracking => {
                    document.getElementById('editTrackingId').value = tracking.trackingId; // This is the user-facing tracking ID
                    document.getElementById('editMongoId').value = tracking._id; // Store Mongo _id for update/delete
                    document.getElementById('editStatus').value = tracking.status;
                    document.getElementById('editStatusLineColor').value = tracking.statusLineColor;
                    document.getElementById('editIsBlinking').checked = tracking.isBlinking;
                    document.getElementById('editSenderName').value = tracking.senderName;
                    document.getElementById('editSenderAddress').value = tracking.senderAddress;
                    document.getElementById('editSenderPhone').value = tracking.senderPhone;
                    document.getElementById('editRecipientName').value = tracking.recipientName;
                    document.getElementById('editRecipientEmail').value = tracking.recipientEmail;
                    document.getElementById('editRecipientAddress').value = tracking.recipientAddress;
                    document.getElementById('editRecipientPhone').value = tracking.recipientPhone;
                    document.getElementById('editPackageContents').value = tracking.packageContents;
                    document.getElementById('editServiceType').value = tracking.serviceType;
                    document.getElementById('editCurrentLocation').value = tracking.currentLocation;
                    document.getElementById('editETA').value = tracking.eta;
                    document.getElementById('editExpectedDeliveryDate').value = tracking.expectedDeliveryDate;
                    document.getElementById('editExpectedDeliveryTime').value = tracking.expectedDeliveryTime;
                    document.getElementById('editSpecialHandling').value = tracking.specialHandling;
                    document.getElementById('editNotes').value = tracking.notes;

                    M.updateTextFields(); // Update Materialize text field states
                    M.FormSelect.init(document.querySelectorAll('#manageTrackingForm select')); // Re-init selects
                })
                .catch(error => {
                    console.error('Error fetching single tracking:', error);
                    M.toast({
                        html: `Failed to load tracking details: ${error.message}`,
                        classes: 'red darken-2'
                    });
                    manageTrackingForm.reset(); // Clear form on error
                    M.updateTextFields();
                });
        } else {
            manageTrackingForm.reset();
            M.updateTextFields();
        }
    });

    manageTrackingForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const mongoId = document.getElementById('editMongoId').value; // Use Mongo _id for API call
        if (!mongoId) {
            M.toast({
                html: 'No tracking selected for update.',
                classes: 'red darken-2'
            });
            return;
        }

        const updatedTrackingData = {
            trackingId: document.getElementById('editTrackingId').value,
            status: document.getElementById('editStatus').value,
            statusLineColor: document.getElementById('editStatusLineColor').value,
            isBlinking: document.getElementById('editIsBlinking').checked,
            senderName: document.getElementById('editSenderName').value,
            senderAddress: document.getElementById('editSenderAddress').value,
            senderPhone: document.getElementById('editSenderPhone').value,
            recipientName: document.getElementById('editRecipientName').value,
            recipientEmail: document.getElementById('editRecipientEmail').value,
            recipientAddress: document.getElementById('editRecipientAddress').value,
            recipientPhone: document.getElementById('editRecipientPhone').value,
            packageContents: document.getElementById('editPackageContents').value,
            serviceType: document.getElementById('editServiceType').value,
            currentLocation: document.getElementById('editCurrentLocation').value,
            eta: document.getElementById('editETA').value,
            expectedDeliveryDate: document.getElementById('editExpectedDeliveryDate').value,
            expectedDeliveryTime: document.getElementById('editExpectedDeliveryTime').value,
            specialHandling: document.getElementById('editSpecialHandling').value,
            notes: document.getElementById('editNotes').value
        };

        fetch(`/api/admin/trackings/${mongoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updatedTrackingData)
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
                    // Refresh both the single tracking dropdown and the all trackings table
                    fetchTrackingIdsForSelect();
                    fetchAllTrackings();
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

    deleteSingleTrackingBtn.addEventListener('click', function() {
        const mongoId = document.getElementById('editMongoId').value;
        if (!mongoId) {
            M.toast({
                html: 'No tracking selected for deletion.',
                classes: 'red darken-2'
            });
            return;
        }

        if (confirm('Are you sure you want to delete this tracking entry? This action cannot be undone.')) {
            fetch(`/api/admin/trackings/${mongoId}`, {
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
                            classes: 'red darken-2'
                        });
                        manageTrackingForm.reset();
                        M.updateTextFields();
                        // Refresh both the single tracking dropdown and the all trackings table
                        fetchTrackingIdsForSelect();
                        fetchAllTrackings();
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
    });

    // --- 3. Manage All Trackings Table ---
    const trackingTableBody = document.getElementById('all-trackings-table-body');

    function fetchAllTrackings() {
        trackingTableBody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 20px;"><div class="preloader-wrapper active"><div class="spinner-layer spinner-blue-only"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div><p>Loading tracking data...</p></td></tr>';

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
            fetch(`/api/admin/trackings/${trackingMongoId}`, {
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

        fetch('/api/admin/send-email', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData,
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

        fetch('/api/admin/upload-package-file', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData,
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


    // --- Dashboard Quick Stats Update ---
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