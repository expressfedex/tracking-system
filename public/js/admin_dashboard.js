document.addEventListener('DOMContentLoaded', function() {
    // Check for a token on page load
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'admin_login.html';
        return;
    }

    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    const dashboardSection = document.getElementById('dashboard-section');
    const trackingsSection = document.getElementById('trackings-section');
    const usersSection = document.getElementById('users-section');
    const settingsSection = document.getElementById('settings-section');
    const menuToggle = document.getElementById('menu-toggle');
    const logoutBtn = document.getElementById('logout-btn');
    const trackingTableBody = document.getElementById('tracking-table-body');
    const addTrackingForm = document.getElementById('addTrackingForm');
    const editTrackingForm = document.getElementById('editTrackingForm');
    const trackingHistoryList = document.getElementById('tracking-history-list');
    const addHistoryForm = document.getElementById('addHistoryForm');
    const trackingIdInput = document.getElementById('trackingId');
    const trackingMongoIdInput = document.getElementById('trackingMongoId');
    const historyTrackingIdDisplay = document.getElementById('historyTrackingIdDisplay');
    const deleteTrackingBtn = document.getElementById('deleteTrackingBtn');
    const trackingIdToDeleteInput = document.getElementById('trackingIdToDelete');
    const trackingIdDisplay = document.getElementById('trackingIdDisplay');
    const sendEmailForm = document.getElementById('sendEmailForm');
    const notificationEmail = document.getElementById('notificationEmail');
    const emailSubject = document.getElementById('emailSubject');
    const notificationMessage = document.getElementById('notificationMessage');
    const emailTrackingIdSelect = document.getElementById('emailTrackingIdSelect');
    const emailAttachmentFileUpload = document.getElementById('emailAttachmentFileUpload');
    const uploadPackageFileForm = document.getElementById('uploadPackageFileForm');
    const attachFileTrackingIdSelect = document.getElementById('attachFileTrackingIdSelect');
    const packageFileInput = document.getElementById('packageFileInput');
    const usersTableBody = document.getElementById('users-table-body');
    const createUserForm = document.getElementById('createUserForm');
    const editUserForm = document.getElementById('editUserForm');
    const deleteUserBtn = document.getElementById('deleteUserBtn');
    const userIdToDeleteInput = document.getElementById('userIdToDelete');
    const usernameToDelete = document.getElementById('usernameToDelete');
    const totalPackages = document.getElementById('totalPackages');
    const deliveredPackages = document.getElementById('deliveredPackages');
    const inTransitPackages = document.getElementById('inTransitPackages');
    const pendingPackages = document.getElementById('pendingPackages');
    const exceptionsPackages = document.getElementById('exceptionsPackages');

    // Modals
    const addTrackingModal = document.getElementById('addTrackingModal');
    const editTrackingModal = document.getElementById('editTrackingModal');
    const deleteTrackingModal = document.getElementById('deleteTrackingModal');
    const trackingHistoryModal = document.getElementById('trackingHistoryModal');
    const createUserModal = document.getElementById('createUserModal');
    const editUserModal = document.getElementById('editUserModal');
    const deleteUserModal = document.getElementById('deleteUserModal');

    // Initialize Materialize Modals
    M.Modal.init(document.querySelectorAll('.modal'));
    
    // Function to show a specific section and hide others
    function showSection(sectionId) {
        dashboardSection.style.display = 'none';
        trackingsSection.style.display = 'none';
        usersSection.style.display = 'none';
        settingsSection.style.display = 'none';
        document.getElementById(sectionId).style.display = 'block';
    }

    // Navigation logic
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);

            // Fetch data for the selected section
            if (sectionId === 'trackings-section') {
                fetchAllTrackings();
                fetchTrackingIdsForSelect();
            } else if (sectionId === 'users-section') {
                fetchAllUsers();
            }
        });
    });

    // Logout
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('token');
        window.location.href = 'admin_login.html';
    });

    // --- Tracking Management Functions ---

    function fetchAllTrackings() {
        fetch('/api/admin/trackings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.status === 401 || response.status === 403) {
                M.toast({ html: 'Session expired. Please log in again.', classes: 'red darken-2' });
                setTimeout(() => window.location.href = 'admin_login.html', 2000);
            }
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Server error fetching trackings');
                });
            }
            return response.json();
        })
        .then(trackings => {
            updateDashboardStats(trackings);
            if (trackingTableBody) {
                trackingTableBody.innerHTML = '';
                if (trackings.length === 0) {
                    trackingTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No trackings found.</td></tr>';
                    return;
                }
                trackings.forEach(tracking => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${tracking.trackingId}</td>
                        <td>${tracking.senderName}</td>
                        <td>${tracking.recipientName}</td>
                        <td>${tracking.status}</td>
                        <td>${new Date(tracking.createdAt).toLocaleDateString()}</td>
                        <td>${new Date(tracking.expectedDeliveryDate).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-small waves-effect waves-light blue darken-1 edit-btn" data-id="${tracking._id}"><i class="material-icons">edit</i></button>
                            <button class="btn btn-small waves-effect waves-light orange darken-2 history-btn" data-id="${tracking._id}" data-trackingid="${tracking.trackingId}"><i class="material-icons">history</i></button>
                            <button class="btn btn-small waves-effect waves-light red darken-2 delete-modal-trigger" data-id="${tracking._id}" data-trackingid="${tracking.trackingId}"><i class="material-icons">delete</i></button>
                        </td>
                    `;
                    trackingTableBody.appendChild(row);
                });

                document.querySelectorAll('.edit-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const id = this.dataset.id;
                        fetchTrackingDetails(id);
                    });
                });

                document.querySelectorAll('.history-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const id = this.dataset.id;
                        const tId = this.dataset.trackingid;
                        historyTrackingIdDisplay.textContent = tId;
                        trackingMongoIdInput.value = id;
                        fetchTrackingHistory(id);
                        M.Modal.getInstance(trackingHistoryModal).open();
                    });
                });

                document.querySelectorAll('.delete-modal-trigger').forEach(button => {
                    button.addEventListener('click', function() {
                        const id = this.dataset.id;
                        const tId = this.dataset.trackingid;
                        trackingIdToDeleteInput.value = id;
                        trackingIdDisplay.textContent = tId;
                        M.Modal.getInstance(deleteTrackingModal).open();
                    });
                });
            }
        })
        .catch(error => {
            console.error('Error fetching trackings:', error);
            if (trackingTableBody) {
                trackingTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: red;">Failed to load trackings: ${error.message}</td></tr>`;
            }
            M.toast({ html: `Failed to load trackings: ${error.message}`, classes: 'red darken-2' });
        });
    }

    if (addTrackingForm) {
        addTrackingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const newTrackingData = {
                trackingId: document.getElementById('newTrackingId').value,
                senderName: document.getElementById('newSenderName').value,
                senderAddress: document.getElementById('newSenderAddress').value,
                recipientName: document.getElementById('newRecipientName').value,
                recipientAddress: document.getElementById('newRecipientAddress').value,
                recipientEmail: document.getElementById('newRecipientEmail').value,
                item: document.getElementById('newItem').value,
                weight: document.getElementById('newWeight').value,
                origin: document.getElementById('newOrigin').value,
                destination: document.getElementById('newDestination').value,
                status: document.getElementById('newStatus').value,
                expectedDeliveryDate: document.getElementById('newExpectedDeliveryDate').value
            };

            fetch('/api/admin/trackings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newTrackingData)
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error adding tracking');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({ html: 'Tracking added successfully!', classes: 'green darken-2' });
                    M.Modal.getInstance(addTrackingModal).close();
                    addTrackingForm.reset();
                    M.updateTextFields();
                    fetchAllTrackings();
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

    function fetchTrackingDetails(id) {
        fetch(`/api/admin/trackings/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Server error fetching tracking details');
                });
            }
            return response.json();
        })
        .then(tracking => {
            document.getElementById('editId').value = tracking._id;
            document.getElementById('editTrackingId').value = tracking.trackingId;
            document.getElementById('editSenderName').value = tracking.senderName;
            document.getElementById('editSenderAddress').value = tracking.senderAddress;
            document.getElementById('editRecipientName').value = tracking.recipientName;
            document.getElementById('editRecipientAddress').value = tracking.recipientAddress;
            document.getElementById('editRecipientEmail').value = tracking.recipientEmail;
            document.getElementById('editItem').value = tracking.item;
            document.getElementById('editWeight').value = tracking.weight;
            document.getElementById('editOrigin').value = tracking.origin;
            document.getElementById('editDestination').value = tracking.destination;
            document.getElementById('editStatus').value = tracking.status;
            document.getElementById('editExpectedDeliveryDate').value = new Date(tracking.expectedDeliveryDate).toISOString().split('T')[0];
            M.updateTextFields();
            M.FormSelect.init(document.querySelectorAll('#editTrackingModal select'));
            M.Modal.getInstance(editTrackingModal).open();
        })
        .catch(error => {
            console.error('Error fetching tracking details:', error);
            M.toast({ html: `Failed to load tracking details: ${error.message}`, classes: 'red darken-2' });
        });
    }

    if (editTrackingForm) {
        editTrackingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const id = document.getElementById('editId').value;
            const updatedTrackingData = {
                trackingId: document.getElementById('editTrackingId').value,
                senderName: document.getElementById('editSenderName').value,
                senderAddress: document.getElementById('editSenderAddress').value,
                recipientName: document.getElementById('editRecipientName').value,
                recipientAddress: document.getElementById('editRecipientAddress').value,
                recipientEmail: document.getElementById('editRecipientEmail').value,
                item: document.getElementById('editItem').value,
                weight: document.getElementById('editWeight').value,
                origin: document.getElementById('editOrigin').value,
                destination: document.getElementById('editDestination').value,
                status: document.getElementById('editStatus').value,
                expectedDeliveryDate: document.getElementById('editExpectedDeliveryDate').value
            };

            fetch(`/api/admin/trackings/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedTrackingData)
            })
            .then(response => {
                if (!response.ok) {
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

    if (deleteTrackingBtn) {
        deleteTrackingBtn.addEventListener('click', function() {
            const id = trackingIdToDeleteInput.value;
            fetch(`/api/admin/trackings/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Server error deleting tracking');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    M.toast({ html: 'Tracking deleted successfully!', classes: 'green darken-2' });
                    M.Modal.getInstance(deleteTrackingModal).close();
                    fetchAllTrackings();
                } else {
                    M.toast({ html: `Error: ${data.message || 'Could not delete tracking.'}`, classes: 'red darken-2' });
                }
            })
            .catch(error => {
                console.error('Error deleting tracking:', error);
                M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
            });
        });
    }

    function fetchTrackingHistory(id) {
        fetch(`/api/admin/trackings/${id}/history`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Server error fetching tracking history');
                });
            }
            return response.json();
        })
        .then(history => {
            if (trackingHistoryList) {
                trackingHistoryList.innerHTML = '';
                if (history.length === 0) {
                    trackingHistoryList.innerHTML = '<p class="center-align">No history events found.</p>';
                    return;
                }
                history.forEach(event => {
                    const listItem = document.createElement('li');
                    listItem.classList.add('collection-item');
                    listItem.innerHTML = `
                        <div>
                            <strong>Status:</strong> ${event.status}<br>
                            <strong>Location:</strong> ${event.location}<br>
                            <strong>Date:</strong> ${new Date(event.timestamp).toLocaleString()}
                            <a href="#!" class="secondary-content red-text delete-history-btn" data-history-id="${event._id}" data-tracking-mongoid="${id}">
                                <i class="material-icons">delete</i>
                            </a>
                        </div>
                    `;
                    trackingHistoryList.appendChild(listItem);
                });

                document.querySelectorAll('.delete-history-btn').forEach(button => {
                    button.addEventListener('click', function(e) {
                        e.preventDefault();
                        const historyId = this.dataset.historyId;
                        const trackingMongoId = this.dataset.trackingMongoid;
                        if (confirm('Are you sure you want to delete this history event?')) {
                            deleteHistoryEvent(trackingMongoId, historyId);
                        }
                    });
                });
            }
        })
        .catch(error => {
            console.error('Error fetching history:', error);
            if (trackingHistoryList) {
                trackingHistoryList.innerHTML = `<p class="center-align red-text">Failed to load history: ${error.message}</p>`;
            }
            M.toast({ html: `Failed to load history: ${error.message}`, classes: 'red darken-2' });
        });
    }

    if (addHistoryForm) {
        addHistoryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const trackingMongoId = trackingMongoIdInput.value;
            const newHistoryData = {
                status: document.getElementById('newHistoryStatus').value,
                location: document.getElementById('newHistoryLocation').value
            };
            
            fetch(`/api/admin/trackings/${trackingMongoId}/history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newHistoryData)
            })
            .then(response => {
                if (!response.ok) {
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
                    fetchTrackingHistory(trackingMongoId);
                } else {
                    M.toast({ html: `Error: ${data.message || 'Could not add history event.'}`, classes: 'red darken-2' });
                }
            })
            .catch(error => {
                console.error('Error adding history:', error);
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
                fetchTrackingHistory(trackingMongoId);
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

            const recipient = notificationEmail.value.trim();
            const subject = emailSubject.value.trim();
            const message = notificationMessage.value.trim();
            const trackingId = emailTrackingIdSelect.value;

            if (!recipient || !subject || !message || !trackingId) {
                M.toast({
                    html: 'All fields are required to send an email.',
                    classes: 'red darken-2'
                });
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
                    M.FormSelect.init(emailTrackingIdSelect);
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
                    if (emailSubject) emailSubject.value = `Update on your Shipment: ${tracking.trackingId || 'N/A'}`;
                    if (notificationMessage) notificationMessage.value = `Dear ${tracking.recipientName || 'Customer'},\n\nYour shipment with tracking ID ${tracking.trackingId || 'N/A'} is currently "${tracking.status || 'N/A'}".\n\nLatest update: ${tracking.status || 'N/A'} at ${new Date().toLocaleString()}.\n\nExpected delivery: ${new Date(tracking.expectedDeliveryDate || '').toLocaleDateString() || 'N/A'}.\n\nThank you for choosing us.`;
                    M.updateTextFields();
                    M.FormSelect.init(document.querySelectorAll('#emailNotificationModal select'));
                })
                .catch(error => {
                    console.error('Error pre-filling email:', error);
                    M.toast({
                        html: `Could not pre-fill email: ${error.message}`,
                        classes: 'red darken-2'
                    });
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
                    M.FormSelect.init(attachFileTrackingIdSelect);
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
            M.toast({
                html: `Failed to load users: ${error.message}`,
                classes: 'red darken-2'
            });
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
                    M.FormSelect.init(document.querySelectorAll('#createUserModal select'));
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
            M.FormSelect.init(document.querySelectorAll('#editUserModal select'));
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

    if (deleteUserBtn) {
        deleteUserBtn.addEventListener('click', function() {
            const userId = userIdToDeleteInput.value.trim();

            if (!userId) {
                M.toast({
                    html: 'Error: User ID is missing or invalid. Cannot delete.',
                    classes: 'red darken-2'
                });
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
                        classes: 'green darken-2'
                    });
                    M.Modal.getInstance(deleteUserModal).close();
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
        const selects = [emailTrackingIdSelect, attachFileTrackingIdSelect];
        selects.forEach(select => {
            if (select) {
                fetch('/api/admin/trackings', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(response => {
                    if (!response.ok) throw new Error('Failed to fetch tracking IDs for dropdowns.');
                    return response.json();
                })
                .then(trackings => {
                    select.innerHTML = '<option value="" disabled selected>Choose a Tracking ID</option>';
                    trackings.forEach(tracking => {
                        const option = document.createElement('option');
                        option.value = tracking.trackingId;
                        option.textContent = tracking.trackingId;
                        select.appendChild(option);
                    });
                    M.FormSelect.init(select);
                })
                .catch(error => {
                    console.error('Error fetching tracking IDs:', error);
                    M.toast({ html: `Failed to populate dropdowns: ${error.message}`, classes: 'red darken-2' });
                });
            }
        });
    }


    // --- Initial setup on page load ---
    showSection('dashboard-section');
    fetchAllTrackings();
    fetchTrackingIdsForSelect();

    // --- Sidebar Toggle Logic ---
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    } else {
        console.error("Sidebar or menu toggle button not found in the DOM.");
    }

    // Initialize Materialize Components
    M.Modal.init(document.querySelectorAll('.modal'));
    M.FormSelect.init(document.querySelectorAll('select'));
    M.Datepicker.init(document.querySelectorAll('.datepicker'));
    M.Timepicker.init(document.querySelectorAll('.timepicker'));

});
