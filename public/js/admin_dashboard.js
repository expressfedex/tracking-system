document.addEventListener('DOMContentLoaded', function() {
    // Initialize Materialize components
    M.Sidenav.init(document.querySelectorAll('.sidenav'));
    M.Modal.init(document.querySelectorAll('.modal'));
    M.FormSelect.init(document.querySelectorAll('select'));
    M.Datepicker.init(document.querySelectorAll('.datepicker'));
    M.CharacterCounter.init(document.querySelectorAll('textarea#newDescription, textarea#editDescription, textarea#notificationMessageInput'));

    // --- Navigation Logic ---
    function showSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById(sectionId).style.display = 'block';
        // Hide mobile sidenav if open
        const sidenavInstance = M.Sidenav.getInstance(document.querySelector('.sidenav'));
        if (sidenavInstance && sidenavInstance.isOpen) {
            sidenavInstance.close();
        }
    }

    document.querySelectorAll('.sidenav a, .nav-links a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);

            // Fetch data relevant to the section being shown
            if (sectionId === 'dashboard-section') {
                fetchAllTrackings(); // Re-fetch to update dashboard stats
            } else if (sectionId === 'manage-trackings-section') {
                fetchAllTrackings();
            } else if (sectionId === 'send-notifications-section') {
                fetchTrackingIdsForEmailSelect();
            } else if (sectionId === 'manage-files-section') {
                fetchTrackingIdsForAttachFileSelect();
            } else if (sectionId === 'manage-users-section') {
                fetchAllUsers();
            } else if (sectionId === 'profile-section') {
                fetchAdminProfile();
            }
        });
    });

    // --- Logout Logic ---
    document.getElementById('logout-btn').addEventListener('click', function() {
        localStorage.removeItem('token');
        M.toast({
            html: 'Logged out successfully!',
            classes: 'green darken-2'
        });
        setTimeout(() => window.location.href = 'admin_login.html', 1000);
    });

    // --- Token Verification (Basic Client-Side Check) ---
    const token = localStorage.getItem('token');
    if (!token) {
        M.toast({
            html: 'No session found. Please log in.',
            classes: 'red darken-2'
        });
        setTimeout(() => window.location.href = 'admin_login.html', 1500);
    }

    // --- 1. Manage Tracking Section ---
    const trackingTableBody = document.getElementById('tracking-table-body');
    const createTrackingModal = document.getElementById('createTrackingModal');
    const createTrackingForm = document.getElementById('createTrackingForm');
    const editTrackingModal = document.getElementById('editTrackingModal');
    const editTrackingForm = document.getElementById('editTrackingForm');
    const deleteTrackingModalTrigger = document.getElementById('deleteTrackingModalTrigger');
    const deleteTrackingBtn = document.getElementById('deleteTrackingBtn');
    const trackingIdToDeleteInput = document.getElementById('trackingIdToDelete');

    function fetchAllTrackings() {
        trackingTableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px;"><div class="preloader-wrapper active"><div class="spinner-layer spinner-blue-only"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div><p>Loading tracking data...</p></td></tr>';

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
                updateDashboardStats(trackings); // Update dashboard stats with fetched data
                renderTrackingTable(trackings);
            })
            .catch(error => {
                console.error('Error fetching trackings:', error);
                trackingTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: red;">Failed to load tracking data: ${error.message}.</td></tr>`;
                M.toast({
                    html: `Failed to load trackings: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    }

    function renderTrackingTable(trackings) {
        trackingTableBody.innerHTML = '';
        if (trackings.length === 0) {
            trackingTableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px;">No tracking data available.</td></tr>';
            return;
        }

        trackings.forEach(tracking => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tracking.trackingId}</td>
                <td>${tracking.shipperName}</td>
                <td>${tracking.recipientName}</td>
                <td>${tracking.origin}</td>
                <td>${tracking.destination}</td>
                <td>${tracking.currentLocation}</td>
                <td>${new Date(tracking.expectedDeliveryDate).toLocaleDateString()}</td>
                <td class="${getStatusColorClass(tracking.status)}">${tracking.status}</td>
                <td>${tracking.packageWeight} kg</td>
                <td>
                    <button class="btn-small waves-effect waves-light blue darken-2 view-history-btn" data-id="${tracking._id}">
                        <i class="fas fa-history"></i> History
                    </button>
                    <button class="btn-small waves-effect waves-light green darken-2 edit-tracking-btn" data-id="${tracking._id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-small waves-effect waves-light red darken-2 delete-tracking-btn" data-id="${tracking._id}">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </td>
            `;
            trackingTableBody.appendChild(row);
        });

        document.querySelectorAll('.view-history-btn').forEach(button => {
            button.addEventListener('click', function() {
                const trackingId = this.dataset.id;
                fetchTrackingHistory(trackingId);
            });
        });

        document.querySelectorAll('.edit-tracking-btn').forEach(button => {
            button.addEventListener('click', function() {
                const trackingId = this.dataset.id;
                fetchTrackingDetails(trackingId);
            });
        });

        document.querySelectorAll('.delete-tracking-btn').forEach(button => {
            button.addEventListener('click', function() {
                const trackingId = this.dataset.id;
                trackingIdToDeleteInput.value = trackingId;
                M.Modal.getInstance(deleteTrackingModalTrigger).open();
            });
        });
    }

    // Create Tracking
    createTrackingForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const trackingData = {
            trackingId: document.getElementById('newTrackingId').value,
            shipperName: document.getElementById('newShipperName').value,
            recipientName: document.getElementById('newRecipientName').value,
            origin: document.getElementById('newOrigin').value,
            destination: document.getElementById('newDestination').value,
            currentLocation: document.getElementById('newCurrentLocation').value,
            expectedDeliveryDate: document.getElementById('newExpectedDeliveryDate').value,
            status: document.getElementById('newStatus').value,
            packageDescription: document.getElementById('newDescription').value,
            packageWeight: parseFloat(document.getElementById('newPackageWeight').value)
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
                    M.Modal.getInstance(createTrackingModal).close();
                    createTrackingForm.reset();
                    M.updateTextFields();
                    M.FormSelect.init(document.querySelectorAll('#createTrackingModal select')); // Re-init selects
                    fetchAllTrackings();
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

    // Fetch Tracking Details for Edit
    function fetchTrackingDetails(trackingId) {
        fetch(`/api/admin/trackings/${trackingId}`, {
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
                document.getElementById('editTrackingIdHidden').value = tracking._id; // Store MongoDB ID
                document.getElementById('editTrackingId').value = tracking.trackingId; // Display user-friendly ID
                document.getElementById('editShipperName').value = tracking.shipperName;
                document.getElementById('editRecipientName').value = tracking.recipientName;
                document.getElementById('editOrigin').value = tracking.origin;
                document.getElementById('editDestination').value = tracking.destination;
                document.getElementById('editCurrentLocation').value = tracking.currentLocation;
                document.getElementById('editExpectedDeliveryDate').value = new Date(tracking.expectedDeliveryDate).toISOString().substring(0, 10);
                document.getElementById('editStatus').value = tracking.status;
                document.getElementById('editDescription').value = tracking.packageDescription;
                document.getElementById('editPackageWeight').value = tracking.packageWeight;
                M.updateTextFields();
                M.FormSelect.init(document.querySelectorAll('#editTrackingModal select')); // Re-init select
                M.Modal.getInstance(editTrackingModal).open();
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
    editTrackingForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const trackingMongoId = document.getElementById('editTrackingIdHidden').value;
        const updatedTrackingData = {
            trackingId: document.getElementById('editTrackingId').value,
            shipperName: document.getElementById('editShipperName').value,
            recipientName: document.getElementById('editRecipientName').value,
            origin: document.getElementById('editOrigin').value,
            destination: document.getElementById('editDestination').value,
            currentLocation: document.getElementById('editCurrentLocation').value,
            expectedDeliveryDate: document.getElementById('editExpectedDeliveryDate').value,
            status: document.getElementById('editStatus').value,
            packageDescription: document.getElementById('editDescription').value,
            packageWeight: parseFloat(document.getElementById('editPackageWeight').value)
        };

        fetch(`/api/admin/trackings/${trackingMongoId}`, {
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
                    M.Modal.getInstance(editTrackingModal).close();
                    editTrackingForm.reset();
                    M.updateTextFields();
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

    // Delete Tracking
    deleteTrackingBtn.addEventListener('click', function() {
        const trackingId = trackingIdToDeleteInput.value;

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
                        classes: 'red darken-2'
                    });
                    M.Modal.getInstance(deleteTrackingModalTrigger).close();
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
    });

    // --- 2. Tracking History Section ---
    const trackingHistoryBody = document.getElementById('tracking-history-body');
    const trackingHistoryModal = document.getElementById('trackingHistoryModal');
    const addHistoryForm = document.getElementById('addHistoryForm');
    const historyTrackingIdInput = document.getElementById('historyTrackingId');

    function fetchTrackingHistory(trackingMongoId) {
        historyTrackingIdInput.value = trackingMongoId; // Set the hidden input for adding new history

        fetch(`/api/admin/trackings/${trackingMongoId}/history`, {
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
                        throw new Error(errorData.message || 'Server error fetching tracking history');
                    });
                }
                return response.json();
            })
            .then(history => {
                renderTrackingHistory(history);
                M.Modal.getInstance(trackingHistoryModal).open();
            })
            .catch(error => {
                console.error('Error fetching tracking history:', error);
                M.toast({
                    html: `Failed to load tracking history: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    }

    function renderTrackingHistory(history) {
        trackingHistoryBody.innerHTML = '';
        if (history.length === 0) {
            trackingHistoryBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No history entries available for this tracking.</td></tr>';
            return;
        }

        history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // Sort by timestamp

        history.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(entry.timestamp).toLocaleString()}</td>
                <td>${entry.location}</td>
                <td><span class="new badge ${getStatusColorClass(entry.status)}" data-badge-caption="">${entry.status}</span></td>
                <td>${entry.description || 'N/A'}</td>
            `;
            trackingHistoryBody.appendChild(row);
        });
    }

    addHistoryForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const trackingId = document.getElementById('historyTrackingId').value;
        const historyEntry = {
            timestamp: document.getElementById('historyTimestamp').value,
            location: document.getElementById('historyLocation').value,
            status: document.getElementById('historyStatus').value,
            description: document.getElementById('historyDescription').value
        };

        fetch(`/api/admin/trackings/${trackingId}/history`, {
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
                        throw new Error(errorData.message || 'Server error adding history entry');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({
                        html: 'History entry added successfully!',
                        classes: 'green darken-2'
                    });
                    addHistoryForm.reset();
                    M.updateTextFields();
                    M.FormSelect.init(document.querySelectorAll('#addHistoryForm select')); // Re-init select
                    fetchTrackingHistory(trackingId); // Refresh history table
                } else {
                    M.toast({
                        html: `Error: ${data.message || 'Could not add history entry.'}`,
                        classes: 'red darken-2'
                    });
                }
            })
            .catch(error => {
                console.error('Error adding history entry:', error);
                M.toast({
                    html: `Network error or server issue: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    });

    // --- 3. Send Notifications Section ---
    const notificationEmailInput = document.getElementById('notificationEmailInput');
    const emailSubjectInput = document.getElementById('emailSubjectInput');
    const notificationMessageInput = document.getElementById('notificationMessageInput');
    const emailTrackingIdSelect = document.getElementById('emailTrackingIdSelect');
    const emailAttachmentFileUpload = document.getElementById('emailAttachmentFileUpload');

    // Populate tracking IDs for email pre-filling
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
                    option.value = tracking.trackingId;
                    option.textContent = tracking.trackingId;
                    emailTrackingIdSelect.appendChild(option);
                });
                M.FormSelect.init(emailTrackingIdSelect); // Re-initialize Materialize select
            })
            .catch(error => {
                console.error('Error fetching tracking IDs for email:', error);
                M.toast({
                    html: `Error fetching email pre-fill IDs: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    }

    emailTrackingIdSelect.addEventListener('change', function() {
        const selectedTrackingId = this.value;
        if (selectedTrackingId) {
            fetch(`/api/admin/trackings/${selectedTrackingId}`, {
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
                            throw new Error(errorData.message || 'Server error fetching tracking details for email pre-fill');
                        });
                    }
                    return response.json();
                })
                .then(tracking => {
                    notificationEmailInput.value = tracking.recipientEmail || ''; // Assuming tracking has recipientEmail
                    emailSubjectInput.value = `Update on your shipment: ${tracking.trackingId}`;
                    notificationMessageInput.value = `Dear ${tracking.recipientName},\n\nYour package with Tracking ID ${tracking.trackingId} currently has a status of "${tracking.status}" at ${tracking.currentLocation}.\n\nExpected delivery date: ${new Date(tracking.expectedDeliveryDate).toLocaleDateString()}.\n\nDescription: ${tracking.packageDescription}.\n\nThank you for your patience.`;
                    M.updateTextFields();
                })
                .catch(error => {
                    console.error('Error pre-filling email fields:', error);
                    M.toast({
                        html: `Could not pre-fill email: ${error.message}`,
                        classes: 'red darken-2'
                    });
                });
        } else {
            // Clear fields if "Select Tracking ID" is chosen
            notificationEmailInput.value = '';
            emailSubjectInput.value = '';
            notificationMessageInput.value = '';
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

    document.addEventListener('DOMContentLoaded', function() {
    // Initialize Materialize components first
    // This will initialize all select, datepicker, timepicker, etc. elements
    M.AutoInit();

    // Get references to the specific elements needed for the file upload form
    // Define these constants here, within the DOMContentLoaded scope,
    // so they are guaranteed to exist when the event listener is attached.
    const uploadPackageFileForm = document.getElementById('uploadPackageFileForm');
    const attachFileTrackingIdSelect = document.getElementById('attachFileTrackingIdSelect');
    const packageFileInput = document.getElementById('packageFileInput');

    // --- File Upload Form Logic (around original line 171) ---
    // Now, add a null check for the form itself before trying to attach the listener
    if (uploadPackageFileForm) {
        uploadPackageFileForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Perform checks for other elements needed within this handler
            // If any of these are null, it indicates a structural HTML issue
            // or an ID mismatch that needs to be resolved in the HTML.
            if (!attachFileTrackingIdSelect || !packageFileInput) {
                console.error("Critical error: 'attachFileTrackingIdSelect' or 'packageFileInput' not found.");
                M.toast({
                    html: 'Internal form error. Please contact support.',
                    classes: 'red darken-2'
                });
                return;
            }

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
                        uploadPackageFileForm.reset();
                        // Clear file input path visually
                        const filePathInput = document.querySelector('#packageFileInput + .file-path-wrapper .file-path');
                        if (filePathInput) filePathInput.value = '';
                        // Re-initialize the Materialize select after reset, if necessary for state change
                        M.FormSelect.init(attachFileTrackingIdSelect);
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
    } else {
        // This log will appear if the form itself is not found on page load.
        console.error("Error: The form with ID 'uploadPackageFileForm' was not found in the DOM. Cannot attach event listener.");
    }

    // --- Other Materialize Initializations (add these if they're not elsewhere) ---
    // Make sure other Materialize components are initialized if you use them.
    // E.g., for date pickers and time pickers:
    const datepickers = document.querySelectorAll('.datepicker');
    M.Datepicker.init(datepickers, {
        format: 'yyyy-mm-dd' // Example format
    });

    const timepickers = document.querySelectorAll('.timepicker');
    M.Timepicker.init(timepickers, {
        twelveHour: false // Example: Use 24-hour format
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