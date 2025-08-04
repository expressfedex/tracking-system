document.addEventListener('DOMContentLoaded', function() {

    // --- Variable Declarations ---
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const trackingsTableBody = document.getElementById('trackings-table-body');
    const trackingDetailsModal = document.getElementById('tracking-details-modal');
    const editTrackingModal = document.getElementById('edit-tracking-modal');
    const editTrackingForm = document.getElementById('edit-tracking-form');
    const addHistoryEventBtn = document.getElementById('add-history-event-btn');
    const usersTableBody = document.getElementById('users-table-body');
    const createUserForm = document.getElementById('create-user-form');
    const createUserModal = document.getElementById('create-user-modal');
    const editUserModal = document.getElementById('edit-user-modal');
    const editUserForm = document.getElementById('edit-user-form');
    const deleteUserModal = document.getElementById('delete-user-modal');
    const deleteUserBtn = document.getElementById('confirm-delete-user-btn');
    const userIdToDeleteInput = document.getElementById('userIdToDelete');
    const usernameToDelete = document.getElementById('usernameToDelete');
    const sendEmailForm = document.getElementById('send-email-form');
    const notificationEmail = document.getElementById('notificationEmail');
    const emailSubject = document.getElementById('emailSubject');
    const notificationMessage = document.getElementById('notificationMessage');
    const emailTrackingIdSelect = document.getElementById('emailTrackingIdSelect');
    const emailAttachmentFileUpload = document.getElementById('emailAttachmentFileUpload');
    const uploadPackageFileForm = document.getElementById('uploadPackageFileForm');
    const attachFileTrackingIdSelect = document.getElementById('attachFileTrackingIdSelect');
    const packageFileInput = document.getElementById('packageFileInput');
    const totalPackages = document.getElementById('totalPackages');
    const deliveredPackages = document.getElementById('deliveredPackages');
    const inTransitPackages = document.getElementById('inTransitPackages');
    const pendingPackages = document.getElementById('pendingPackages');
    const exceptionsPackages = document.getElementById('exceptionsPackages');


    // --- Helper Functions ---
    function showSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
            activeSection.style.display = 'block';
        }
    }

    // --- Tracking Management Functions ---
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
            updateDashboardStats(trackings);
            if (trackingsTableBody) {
                trackingsTableBody.innerHTML = '';
                if (trackings.length === 0) {
                    trackingsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No trackings found.</td></tr>';
                    return;
                }
                trackings.forEach(tracking => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${tracking.trackingId}</td>
                        <td>${tracking.senderName}</td>
                        <td>${tracking.recipientName}</td>
                        <td>${tracking.status}</td>
                        <td>${tracking.currentLocation}</td>
                        <td>${new Date(tracking.expectedDeliveryDate).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-small waves-effect waves-light blue darken-1 view-tracking-btn" data-tracking-id="${tracking._id}"><i class="material-icons">visibility</i></button>
                            <button class="btn btn-small waves-effect waves-light green darken-2 edit-tracking-btn" data-tracking-id="${tracking._id}"><i class="material-icons">edit</i></button>
                            <button class="btn btn-small waves-effect waves-light red darken-2 delete-tracking-btn" data-tracking-id="${tracking._id}"><i class="material-icons">delete</i></button>
                        </td>
                    `;
                    trackingsTableBody.appendChild(row);
                });

                document.querySelectorAll('.view-tracking-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const trackingMongoId = this.dataset.trackingId;
                        fetchTrackingDetails(trackingMongoId, true); // true to view, not edit
                    });
                });

                document.querySelectorAll('.edit-tracking-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const trackingMongoId = this.dataset.trackingId;
                        fetchTrackingDetails(trackingMongoId);
                    });
                });
                
                document.querySelectorAll('.delete-tracking-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const trackingMongoId = this.dataset.trackingId;
                        deleteTracking(trackingMongoId);
                    });
                });
            }
        })
        .catch(error => {
            console.error('Error fetching trackings:', error);
            if (trackingsTableBody) {
                trackingsTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: red;">Failed to load trackings: ${error.message}</td></tr>`;
            }
            M.toast({ html: `Failed to load trackings: ${error.message}`, classes: 'red darken-2' });
        });
    }

    function fetchTrackingDetails(trackingMongoId, isViewOnly = false) {
        fetch(`/api/admin/trackings/${trackingMongoId}`, {
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
            if (isViewOnly) {
                // Populate the view modal
                document.getElementById('trackingIdView').textContent = tracking.trackingId || 'N/A';
                document.getElementById('senderNameView').textContent = tracking.senderName || 'N/A';
                document.getElementById('recipientNameView').textContent = tracking.recipientName || 'N/A';
                document.getElementById('currentStatusView').textContent = tracking.status || 'N/A';
                document.getElementById('currentLocationView').textContent = tracking.currentLocation || 'N/A';
                document.getElementById('expectedDeliveryDateView').textContent = tracking.expectedDeliveryDate ? new Date(tracking.expectedDeliveryDate).toLocaleDateString() : 'N/A';
                
                const historyList = document.getElementById('tracking-history-list');
                historyList.innerHTML = '';
                tracking.history.forEach(historyEvent => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${new Date(historyEvent.timestamp).toLocaleString()}</strong> - ${historyEvent.description} at ${historyEvent.location}`;
                    historyList.appendChild(li);
                });

                if (tracking.files && tracking.files.length > 0) {
                    const filesList = document.getElementById('package-files-list');
                    filesList.innerHTML = '';
                    tracking.files.forEach(file => {
                        const li = document.createElement('li');
                        li.innerHTML = `<a href="${file.url}" target="_blank">${file.filename}</a>`;
                        filesList.appendChild(li);
                    });
                    document.getElementById('package-files-container').style.display = 'block';
                } else {
                    document.getElementById('package-files-container').style.display = 'none';
                }

                M.Modal.getInstance(trackingDetailsModal).open();

            } else {
                // Populate the edit form fields
                document.getElementById('editTrackingMongoId').value = tracking._id;
                document.getElementById('editTrackingId').value = tracking.trackingId;
                document.getElementById('editSenderName').value = tracking.senderName;
                document.getElementById('editSenderAddress').value = tracking.senderAddress;
                document.getElementById('editRecipientName').value = tracking.recipientName;
                document.getElementById('editRecipientAddress').value = tracking.recipientAddress;
                document.getElementById('editRecipientEmail').value = tracking.recipientEmail;
                document.getElementById('editCurrentLocation').value = tracking.currentLocation;
                document.getElementById('editStatus').value = tracking.status;
                document.getElementById('editExpectedDeliveryDate').value = tracking.expectedDeliveryDate ? new Date(tracking.expectedDeliveryDate).toISOString().slice(0, 10) : '';
                M.updateTextFields();

                // Populate the history events
                const historyContainer = document.getElementById('editTrackingHistory');
                historyContainer.innerHTML = '';
                tracking.history.forEach(historyEvent => {
                    const timestamp = new Date(historyEvent.timestamp);
                    const date = timestamp.toISOString().slice(0, 10);
                    const time = timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
                    
                    const historyItem = document.createElement('div');
                    historyItem.className = 'history-event-item row';
                    historyItem.dataset.historyId = historyEvent._id;
                    historyItem.innerHTML = `
                        <div class="col s12 m6 l3">
                            <label for="editHistoryDate">Date</label>
                            <input type="text" class="datepicker history-date" value="${date}">
                        </div>
                        <div class="col s12 m6 l3">
                            <label for="editHistoryTime">Time</label>
                            <input type="text" class="timepicker history-time" value="${time}">
                        </div>
                        <div class="input-field col s12 m6 l3">
                            <input type="text" class="history-location" value="${historyEvent.location}">
                            <label for="editHistoryLocation">Location</label>
                        </div>
                        <div class="input-field col s12 m6 l3">
                            <input type="text" class="history-description" value="${historyEvent.description}">
                            <label for="editHistoryDescription">Description</label>
                        </div>
                        <div class="col s12">
                            <button type="button" class="btn btn-small waves-effect waves-light red darken-2 remove-history-event-btn"><i class="material-icons">delete</i></button>
                        </div>
                    `;
                    historyContainer.appendChild(historyItem);
                });

                // Initialize Materialize components in the modal
                M.updateTextFields();
                M.FormSelect.init(document.querySelectorAll('#editTrackingModal select'));
                M.Datepicker.init(document.querySelectorAll('#editTrackingModal .datepicker'));
                M.Timepicker.init(document.querySelectorAll('#editTrackingModal .timepicker'));

                // Open the modal
                M.Modal.getInstance(editTrackingModal).open();
            }
        })
        .catch(error => {
            console.error('Error fetching tracking details:', error);
            M.toast({ html: `Failed to load tracking details: ${error.message}`, classes: 'red darken-2' });
        });
    }

    function deleteTracking(trackingMongoId) {
        if (!confirm('Are you sure you want to delete this tracking ID and all its history? This action cannot be undone.')) {
            return;
        }

        fetch(`/api/admin/trackings/${trackingMongoId}`, {
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
                M.toast({ html: 'Tracking ID deleted successfully!', classes: 'green darken-2' });
                fetchAllTrackings();
            } else {
                M.toast({ html: `Error: ${data.message || 'Could not delete tracking ID.'}`, classes: 'red darken-2' });
            }
        })
        .catch(error => {
            console.error('Error deleting tracking:', error);
            M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
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
                    fetchTrackingDetails(trackingMongoId); // Re-fetch to update the modal
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

    // --- Add New History Event Button ---
    if (addHistoryEventBtn) {
        addHistoryEventBtn.addEventListener('click', function() {
            const historyContainer = document.getElementById('editTrackingHistory');
            const historyItem = document.createElement('div');
            historyItem.className = 'history-event-item row';
            historyItem.innerHTML = `
                <div class="col s12 m6 l3">
                    <label for="editHistoryDate">Date</label>
                    <input type="text" class="datepicker history-date">
                </div>
                <div class="col s12 m6 l3">
                    <label for="editHistoryTime">Time</label>
                    <input type="text" class="timepicker history-time">
                </div>
                <div class="input-field col s12 m6 l3">
                    <input type="text" class="history-location" placeholder="e.g., New York, NY">
                    <label for="editHistoryLocation">Location</label>
                </div>
                <div class="input-field col s12 m6 l3">
                    <input type="text" class="history-description" placeholder="e.g., Arrived at facility">
                    <label for="editHistoryDescription">Description</label>
                </div>
                <div class="col s12">
                    <button type="button" class="btn btn-small waves-effect waves-light red darken-2 remove-history-event-btn"><i class="material-icons">delete</i></button>
                </div>
            `;
            historyContainer.appendChild(historyItem);
            M.Datepicker.init(historyItem.querySelector('.datepicker'));
            M.Timepicker.init(historyItem.querySelector('.timepicker'));
        });

        // Add event listener for dynamically added remove buttons
        document.addEventListener('click', function(e) {
            if (e.target.closest('.remove-history-event-btn')) {
                const item = e.target.closest('.history-event-item');
                const historyId = item.dataset.historyId;
                const trackingMongoId = document.getElementById('editTrackingMongoId').value;
                if (historyId) {
                    deleteHistoryEvent(trackingMongoId, historyId);
                } else {
                    item.remove();
                }
            }
        });
    }

    // --- Edit Tracking Form Submission ---
    if (editTrackingForm) {
        editTrackingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const trackingMongoId = document.getElementById('editTrackingMongoId').value;
            const historyEvents = [];
            document.querySelectorAll('#editTrackingHistory .history-event-item').forEach(item => {
                const date = item.querySelector('.history-date').value;
                const time = item.querySelector('.history-time').value;
                const location = item.querySelector('.history-location').value;
                const description = item.querySelector('.history-description').value;
                const historyId = item.dataset.historyId;

                if (date && time) {
                    historyEvents.push({
                        _id: historyId,
                        timestamp: new Date(`${date}T${time}`).toISOString(),
                        location: location,
                        description: description
                    });
                }
            });

            const updatedTrackingData = {
                trackingId: document.getElementById('editTrackingId').value,
                senderName: document.getElementById('editSenderName').value,
                senderAddress: document.getElementById('editSenderAddress').value,
                recipientName: document.getElementById('editRecipientName').value,
                recipientAddress: document.getElementById('editRecipientAddress').value,
                recipientEmail: document.getElementById('editRecipientEmail').value,
                currentLocation: document.getElementById('editCurrentLocation').value,
                status: document.getElementById('editStatus').value,
                expectedDeliveryDate: document.getElementById('editExpectedDeliveryDate').value,
                history: historyEvents
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
                    M.Modal.getInstance(editTrackingModal).close();
                    fetchAllTrackings();
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

    // --- Send Email Notification ---
    if (sendEmailForm) {
        sendEmailForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const recipient = notificationEmail.value.trim();
            const subject = emailSubject.value.trim();
            const message = notificationMessage.value.trim();
            const trackingId = emailTrackingIdSelect.value;

            if (!recipient || !subject || !message || !trackingId) {
                M.toast({ html: 'All fields are required to send an email.', classes: 'red darken-2' });
                return;
            }

            const formData = new FormData();
            formData.append('recipientEmail', recipient);
            formData.append('subject', subject);
            formData.append('message', message);
            formData.append('trackingId', trackingId);

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
                    M.FormSelect.init(emailTrackingIdSelect);
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
                    if (emailSubject) emailSubject.value = `Update on your Shipment: ${tracking.trackingId || 'N/A'}`;
                    if (notificationMessage) notificationMessage.value = `Dear ${tracking.recipientName || 'Customer'},\n\nYour shipment with tracking ID ${tracking.trackingId || 'N/A'} is currently "${tracking.status || 'N/A'}".\n\nLatest update: ${tracking.status || 'N/A'} at ${new Date().toLocaleString()}.\n\nExpected delivery: ${new Date(tracking.expectedDeliveryDate || '').toLocaleDateString() || 'N/A'}.\n\nThank you for choosing us.`;
                    M.updateTextFields();
                })
                .catch(error => {
                    console.error('Error pre-filling email:', error);
                    M.toast({ html: `Could not pre-fill email: ${error.message}`, classes: 'red darken-2' });
                });
            } else {
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
            formData.append('packageFile', file);

            fetch(`/api/admin/trackings/${trackingId}/upload-file`, {
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
                    M.FormSelect.init(attachFileTrackingIdSelect);
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
                usersTableBody.innerHTML = '';
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
                        M.Modal.getInstance(deleteUserModal).open();
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
                        M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
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
                    M.toast({ html: 'User created successfully!', classes: 'green darken-2' });
                    M.Modal.getInstance(createUserModal).close();
                    createUserForm.reset();
                    M.updateTextFields();
                    M.FormSelect.init(document.querySelectorAll('#createUserModal select'));
                    fetchAllUsers();
                } else {
                    M.toast({ html: `Error: ${data.message || 'Could not create user.'}`, classes: 'red darken-2' });
                }
            })
            .catch(error => {
                console.error('Error creating user:', error);
                M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
            });
        });
    }

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
                    M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
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
            M.FormSelect.init(document.querySelectorAll('#editUserModal select'));
            M.Modal.getInstance(editUserModal).open();
        })
        .catch(error => {
            console.error('Error fetching user details:', error);
            M.toast({ html: `Failed to load user details: ${error.message}`, classes: 'red darken-2' });
        });
    }

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
                        M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
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
                    M.toast({ html: 'User updated successfully!', classes: 'green darken-2' });
                    M.Modal.getInstance(editUserModal).close();
                    editUserForm.reset();
                    M.updateTextFields();
                    fetchAllUsers();
                } else {
                    M.toast({ html: `Error: ${data.message || 'Could not update user.'}`, classes: 'red darken-2' });
                }
            })
            .catch(error => {
                console.error('Error updating user:', error);
                M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
            });
        });
    }

    if (deleteUserBtn) {
        deleteUserBtn.addEventListener('click', function() {
            const userId = userIdToDeleteInput.value.trim();

            if (!userId) {
                M.toast({ html: 'Error: User ID is missing or invalid. Cannot delete.', classes: 'red darken-2' });
                M.Modal.getInstance(deleteUserModal).close();
                return;
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
                        M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
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
                    M.toast({ html: 'User deleted successfully!', classes: 'green darken-2' });
                    M.Modal.getInstance(deleteUserModal).close();
                    fetchAllUsers();
                } else {
                    M.toast({ html: `Error: ${data.message || 'Could not delete user.'}`, classes: 'red darken-2' });
                }
            })
            .catch(error => {
                console.error('Error deleting user:', error);
                M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
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

    // --- Placeholder functions for populating dropdowns ---
    function fetchTrackingIdsForSelect() {
        fetch('/api/admin/trackings/ids', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => response.json())
        .then(trackingIds => {
            if (emailTrackingIdSelect) {
                emailTrackingIdSelect.innerHTML = '<option value="" disabled selected>Choose Tracking ID</option>';
                trackingIds.forEach(id => {
                    const option = document.createElement('option');
                    option.value = id;
                    option.textContent = id;
                    emailTrackingIdSelect.appendChild(option);
                });
                M.FormSelect.init(emailTrackingIdSelect);
            }
            if (attachFileTrackingIdSelect) {
                attachFileTrackingIdSelect.innerHTML = '<option value="" disabled selected>Choose Tracking ID</option>';
                trackingIds.forEach(id => {
                    const option = document.createElement('option');
                    option.value = id;
                    option.textContent = id;
                    attachFileTrackingIdSelect.appendChild(option);
                });
                M.FormSelect.init(attachFileTrackingIdSelect);
            }
        })
        .catch(error => {
            console.error('Error fetching tracking IDs:', error);
            M.toast({ html: 'Failed to load tracking IDs for dropdowns.', classes: 'red darken-2' });
        });
    }
    
    // --- Initial setup on page load ---
    showSection('dashboard-section');
    fetchAllTrackings();
    fetchAllUsers();
    fetchTrackingIdsForSelect();

    // --- Sidebar Toggle Logic ---
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    } else {
        console.error("Sidebar or menu toggle button not found in the DOM.");
    }

    // --- Navigation Links ---
    document.querySelectorAll('.sidebar ul li a').forEach(link => {
        link.addEventListener('click', function(e) {
            const targetSectionId = e.target.closest('a').getAttribute('data-target');
            if (targetSectionId) {
                e.preventDefault();
                showSection(targetSectionId);
                // Re-fetch data when switching sections
                if (targetSectionId === 'trackings-section') {
                    fetchAllTrackings();
                } else if (targetSectionId === 'users-section') {
                    fetchAllUsers();
                }
            }
        });
    });

    // Initialize Materialize Components
    M.Modal.init(document.querySelectorAll('.modal'));
    M.FormSelect.init(document.querySelectorAll('select'));
    M.Datepicker.init(document.querySelectorAll('.datepicker'));
    M.Timepicker.init(document.querySelectorAll('.timepicker'));
});
