document.addEventListener('DOMContentLoaded', function() {
    // --- Element Selectors ---
    const usersTableBody = document.getElementById('users-table-body');
    const createUserForm = document.getElementById('createUserForm');
    const editUserForm = document.getElementById('editUserForm');
    const deleteUserBtn = document.getElementById('confirmDeleteUserBtn');
    const userIdToDeleteInput = document.getElementById('userIdToDelete');
    const usernameToDelete = document.getElementById('usernameToDelete');
    const createUserModal = document.getElementById('createUserModal');
    const editUserModal = document.getElementById('editUserModal');
    const deleteUserModal = document.getElementById('deleteUserModal');

    // Tracking-related elements
    const trackingHistoryList = document.getElementById('tracking-history-list');
    const addHistoryForm = document.getElementById('addHistoryForm');
    const updateTrackingMongoId = document.getElementById('updateTrackingMongoId');
    const editHistoryModal = document.getElementById('editHistoryModal');
    const editHistoryModalTrackingMongoId = document.getElementById('editHistoryModalTrackingMongoId');
    const editHistoryModalHistoryId = document.getElementById('editHistoryModalHistoryId');
    const editHistoryDate = document.getElementById('editHistoryDate');
    const editHistoryTime = document.getElementById('editHistoryTime');
    const editHistoryLocation = document.getElementById('editHistoryLocation');
    const editHistoryDescription = document.getElementById('editHistoryDescription');
    const saveHistoryEditBtn = document.getElementById('saveHistoryEditBtn');

    // Email-related elements
    const sendEmailForm = document.getElementById('sendEmailForm');
    const notificationEmail = document.getElementById('notificationEmail');
    const emailSubject = document.getElementById('emailSubject');
    const notificationMessage = document.getElementById('notificationMessage');
    const emailTrackingIdSelect = document.getElementById('emailTrackingIdSelect');
    const emailAttachmentFileUpload = document.getElementById('emailAttachmentFileUpload');

    // File upload-related elements
    const uploadPackageFileForm = document.getElementById('uploadPackageFileForm');
    const attachFileTrackingIdSelect = document.getElementById('attachFileTrackingIdSelect');
    const packageFileInput = document.getElementById('packageFileInput');

    // Dashboard stats elements
    const totalPackages = document.getElementById('totalPackages');
    const deliveredPackages = document.getElementById('deliveredPackages');
    const inTransitPackages = document.getElementById('inTransitPackages');
    const pendingPackages = document.getElementById('pendingPackages');
    const exceptionsPackages = document.getElementById('exceptionsPackages');

    // Sidebar and navigation
     const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    // --- Sidebar Nav Handler to Switch Sections and Fetch Data ---
document.querySelectorAll('.sidebar a[data-section]').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const sectionId = this.getAttribute('data-section');

        // Hide all sections and show the target one
        showSection(sectionId);

        // Remove 'active' class from all links and add to the clicked one
        document.querySelectorAll('.sidebar a').forEach(item => {
            item.classList.remove('active');
        });
        this.classList.add('active');

        // Fetch data based on the section
        if (sectionId === 'dashboard-section') {
            fetchAllTrackings();
        } else if (sectionId === 'manage-users-section') {
            fetchAllUsers();
        } else if (sectionId === 'add-tracking-section') {
            fetchTrackingIdsForSelect();
        } else if (sectionId === 'manage-tracking-section') {
             fetchAllTrackings();
        } else if (sectionId === 'manage-tracking-section-update') {
            fetchTrackingIdsForSelect(); // Assuming this populates the update form
        } else if (sectionId === 'send-email-section') {
            fetchTrackingIdsForEmailSelect();
        } else if (sectionId === 'upload-file-section') {
            fetchTrackingIdsForAttachFileSelect();
        }
    });
});

    // --- Utility Functions ---
    // This is a placeholder function, assume it exists elsewhere in the original file
 function fetchAllTrackings() {
    fetch('/api/admin/trackings', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            // Handle HTTP errors, e.g., 401, 403, 500
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
        // Update the dashboard statistics using the fetched data
        updateDashboardStats(trackings);

        // Populate the "Manage Trackings" table
const manageTrackingTableBody = document.getElementById('all-trackings-table-body');
        if (manageTrackingTableBody) {
            manageTrackingTableBody.innerHTML = '';
            if (trackings.length === 0) {
                manageTrackingTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No trackings found.</td></tr>';
            }
            trackings.forEach(tracking => {
                const statusClass = getStatusColorClass(tracking.status);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${tracking.trackingId}</td>
                    <td>${tracking.recipientName}</td>
                    <td>${tracking.expectedDelivery ? new Date(tracking.expectedDelivery).toLocaleDateString() : 'N/A'}</td>
                    <td class="status-cell"><span class="status-dot ${statusClass}"></span>${tracking.status}</td>
                    <td>
                        <button class="btn btn-small waves-effect waves-light blue darken-1 update-tracking-btn" data-tracking-id="${tracking.trackingId}"><i class="material-icons">edit</i></button>
                        <button class="btn btn-small waves-effect waves-light red darken-2 delete-tracking-btn" data-tracking-id="${tracking.trackingId}"><i class="material-icons">delete</i></button>
                    </td>
                `;
                manageTrackingTableBody.appendChild(row);
            });
            // You may need a function here to attach listeners to the new buttons
            // attachTrackingButtonListeners();
        }
    })
    .catch(error => {
        console.error('Error fetching trackings:', error);
        M.toast({ html: `Failed to load trackings: ${error.message}`, classes: 'red darken-2' });
    });
}
    

 // Function to fetch all tracking IDs and populate select elements
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
                M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                setTimeout(() => window.location.href = 'admin_login.html', 2000);
            }
            return response.json().then(errorData => {
                throw new Error(errorData.message || 'Server error fetching tracking IDs');
            });
        }
        return response.json();
    })
    .then(trackingIds => {
        const selects = document.querySelectorAll('#add-tracking-section .tracking-id-select, #manage-tracking-section-update .tracking-id-select');
        
        selects.forEach(selectElement => {
            selectElement.innerHTML = '<option value="" disabled selected>Choose a tracking ID</option>'; // Reset the options
            trackingIds.forEach(id => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = id;
                selectElement.appendChild(option);
            });
            // Re-initialize Materialize select element
            M.FormSelect.init(selectElement);
        });
    })
    .catch(error => {
        console.error('Error fetching tracking IDs:', error);
        M.toast({ html: `Failed to load tracking IDs: ${error.message}`, classes: 'red darken-2' });
    });
}
    
    function fetchTrackingIdsForEmailSelect() {
        console.log('Fetching tracking IDs for email select dropdown...');
        // Placeholder for the actual fetch call
    }

    function fetchTrackingIdsForAttachFileSelect() {
        console.log('Fetching tracking IDs for attach file select dropdown...');
        // Placeholder for the actual fetch call
    }

    function showSection(sectionId) {
        document.querySelectorAll('main > section').forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById(sectionId).style.display = 'block';
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
    function fetchTrackingHistory(trackingId) { // The 'trackingId' parameter is critical
        console.log(`Attempting to fetch history for tracking ID: ${trackingId}`); // This log will show what's being sent

        // The fetch request is now going to: /api/admin/trackings/YOUR_CUSTOM_TRACKING_ID
        fetch(`/api/admin/trackings/${trackingId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            .then(response => {
                if (!response.ok) { // This is where response.status is checked
                    if (response.status === 401 || response.status === 403) {
                        // ... session expired logic ...
                        M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
                        setTimeout(() => window.location.href = 'admin_login.html', 2000);
                    }
                    // If the status is 404 (Not Found), this will run
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
                if (ul) {
                    ul.innerHTML = `<li class="collection-item red-text">Failed to load history: ${error.message}</li>`;
                }
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
                    fetchTrackingHistory(trackingMongoId);
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


            // --- ADDED DEBUGGING LOGS (as discussed) ---
            console.log('--- Email Form Submission Debug ---');
            console.log('Recipient Element:', notificationEmail);
            console.log('Subject Element:', emailSubject);
            console.log('Message Element:', notificationMessage);
            console.log('Tracking ID Select Element:', emailTrackingIdSelect);

            console.log('Recipient Value (trimmed):', `'${recipient}'`); // Added quotes to clearly show empty strings
            console.log('Subject Value (trimmed):', `'${subject}'`); // Added quotes
            console.log('Message Value (trimmed):', `'${message}'`); // Added quotes
            console.log('Tracking ID Value:', `'${trackingId}'`); // Added quotes
            console.log('---------------------------------');
            // --- END DEBUGGING LOGS ---

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
                        // Added more robust checks for potentially missing data from backend
                        if (notificationEmail) notificationEmail.value = tracking.recipientEmail || '';
                        if (emailSubject) emailSubject.value = `Update on your FedEx Shipment: ${tracking.trackingId || 'N/A'}`;
                        if (notificationMessage) notificationMessage.value = `Dear ${tracking.recipientName || 'Customer'},\n\nYour shipment with tracking ID ${tracking.trackingId || 'N/A'} is currently "${tracking.status || 'N/A'}".\n\nLatest update: ${tracking.status || 'N/A'} at ${new Date().toLocaleString()}.\n\nExpected delivery: ${new Date(tracking.expectedDeliveryDate || '').toLocaleDateString() || 'N/A'}.\n\nThank you for choosing FedEx.`;
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
                            M.Modal.getInstance(deleteUserModal).open(); // Open the delete confirmation modal
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
                M.Modal.getInstance(deleteUserModal).close(); // Correctly close the modal
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
                            classes: 'green darken-2'
                        });
                        M.Modal.getInstance(deleteUserModal).close(); // Correctly close the modal
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
