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
    const trackingTableBody = document.getElementById('tracking-table-body');
    const historyList = document.querySelector('#historyEvents');
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
    const updateRecipientNameInput = document.getElementById('updateRecipientName');
    const updateOriginInput = document.getElementById('updateOrigin');
    const updateDestinationInput = document.getElementById('updateDestination');
    const updateStatusInput = document.getElementById('updateStatus');
    const updateEstimatedDeliveryInput = document.getElementById('updateEstimatedDelivery');

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

    // --- UTILITY FUNCTIONS (Correctly defined in the main scope) ---
    function showSection(sectionId) {
        document.querySelectorAll('main > section').forEach(section => {
            section.style.display = 'none';
        });
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
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

   // --- Functions to handle Tracking Management ---

function renderAllTrackingsTable(trackings) {
    const tableBody = document.getElementById('all-trackings-table-body');
    tableBody.innerHTML = ''; // Clear previous content

    if (!trackings || trackings.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="14" style="text-align: center;">No tracking data available.</td></tr>';
        return;
    }

    trackings.forEach(tracking => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${tracking.trackingId}</td>
            <td>${tracking.status}</td>
            <td>${tracking.statusLineColor}</td>
            <td>${tracking.isBlinking ? 'Yes' : 'No'}</td>
            <td>${tracking.senderName}</td>
            <td>${tracking.recipientName}</td>
            <td>${tracking.recipientEmail}</td>
            <td>${tracking.packageContents}</td>
            <td>${tracking.serviceType}</td>
            <td>${tracking.recipientAddress}</td>
            <td>${tracking.specialHandling || 'N/A'}</td>
            <td>${tracking.expectedDeliveryDate || 'N/A'}</td>
            <td>${tracking.lastUpdated}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-small waves-effect waves-light blue darken-2 view-edit-btn"
                            data-tracking-id="${tracking.trackingId}"
                            data-id="${tracking._id}">
                        View/Edit
                    </button>
                    <button class="btn-small waves-effect waves-light red darken-2 delete-btn"
                            data-tracking-id="${tracking.trackingId}"
                            data-id="${tracking._id}">
                        Delete
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}
    
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
            // Data has been fetched successfully
            updateDashboardStats(trackings);
            renderAllTrackingsTable(trackings); 
            
            // --- FIX: Add this line to populate the dropdown
            populateSingleTrackingSelect(trackings); 

            attachSingleTrackingSelectListener();     
        })
        .catch(error => {
            console.error('Error fetching trackings:', error);
            M.toast({
                html: `Failed to load trackings: ${error.message}`,
                classes: 'red darken-2'
            });
            const trackingTableBody = document.getElementById('all-trackings-table-body');
            if (trackingTableBody) {
                trackingTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">Failed to load trackings: ${error.message}</td></tr>`;
            }
        });
}
    
/**
 * Populates the single tracking select dropdown with tracking IDs.
 * @param {Array<Object>} trackings - The array of tracking objects.
 */
function populateSingleTrackingSelect(trackings) {
    const selectElement = document.getElementById('singleTrackingIdSelect');

    if (!selectElement) {
        console.error('Error: Single tracking select dropdown with ID "singleTrackingIdSelect" not found.');
        return;
    }

    // Clear existing options, keeping the placeholder
    selectElement.innerHTML = '<option value="" disabled selected>Select Tracking ID</option>';

    if (trackings && trackings.length > 0) {
        trackings.forEach(tracking => {
            const option = document.createElement('option');
            // Based on your JSON, 'trackingId' is the correct property name
            option.value = tracking.trackingId;
            option.textContent = tracking.trackingId;
            selectElement.appendChild(option);
        });
    }

    // Re-initialize Materialize select dropdown to reflect new options
    M.FormSelect.init(selectElement);
}
    // --- Event Listener for Single Tracking Dropdown ---
// NOTE: This function's definition must be outside of the fetchAllTrackings call.
function attachSingleTrackingSelectListener() {
    const singleTrackingIdSelect = document.getElementById('singleTrackingIdSelect');
    if (singleTrackingIdSelect) {
        singleTrackingIdSelect.addEventListener('change', function() {
            const selectedTrackingId = this.value;
            if (selectedTrackingId) {
                // Call the existing function to populate the form
                populateUpdateTrackingForm(selectedTrackingId);
            }
        });
    }
}
    
    function attachTrackingButtonListeners() {
        // Listener for Edit Tracking Buttons
        document.querySelectorAll('.update-tracking-btn').forEach(button => {
            button.addEventListener('click', function() {
                const trackingId = this.dataset.trackingId;
                if (trackingId) {
                    showSection('manage-tracking-section-update');
                    populateUpdateTrackingForm(trackingId);
                } else {
                    M.toast({
                        html: 'Tracking ID not found on button.',
                        classes: 'red darken-2'
                    });
                }
            });
        });

        // Listener for Delete Tracking Buttons
        document.querySelectorAll('.delete-tracking-modal-trigger').forEach(button => {
            button.addEventListener('click', function() {
                const trackingId = this.dataset.trackingId;
                if (trackingId) {
                    const trackingIdToDeleteInput = document.getElementById('trackingIdToDelete');
                    if (trackingIdToDeleteInput) trackingIdToDeleteInput.value = trackingId;

                    const trackingIdConfirmation = document.getElementById('trackingIdConfirmation');
                    if (trackingIdConfirmation) trackingIdConfirmation.textContent = trackingId;

                    const deleteTrackingModal = document.getElementById('deleteTrackingModal');
                    if (deleteTrackingModal) M.Modal.getInstance(deleteTrackingModal).open();
                } else {
                    M.toast({
                        html: 'Tracking ID not found for deletion.',
                        classes: 'red darken-2'
                    });
                }
            });
        });
    }

    function populateUpdateTrackingForm(trackingId) {
        fetch(`/api/admin/trackings/${trackingId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
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
            .then(trackingData => {
                if (updateTrackingMongoId) updateTrackingMongoId.value = trackingData._id;
                if (updateRecipientNameInput) updateRecipientNameInput.value = trackingData.recipientName;
                if (updateOriginInput) updateOriginInput.value = trackingData.origin;
                if (updateDestinationInput) updateDestinationInput.value = trackingData.destination;
                if (updateStatusInput) updateStatusInput.value = trackingData.status;
                if (updateEstimatedDeliveryInput) {
                    updateEstimatedDeliveryInput.value = trackingData.expectedDeliveryDate ? new Date(trackingData.expectedDeliveryDate).toISOString().split('T')[0] : '';
                }

                M.updateTextFields();

                fetchTrackingHistory(trackingData.trackingId);
            })
            .catch(error => {
                console.error('Error populating update tracking form:', error);
                M.toast({
                    html: `Failed to load tracking details: ${error.message}`,
                    classes: 'red darken-2'
                });
            });
    }

    function deleteTracking(trackingId) {
        console.log('Attempting to delete tracking with ID:', trackingId);
        if (!trackingId) {
            M.toast({
                html: 'Invalid tracking ID. Cannot delete.',
                classes: 'red darken-2'
            });
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
                    M.Modal.getInstance(document.getElementById('deleteTrackingModal')).close();
                    fetchAllTrackings();
                    // Refetch dropdowns
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
        console.log(`Attempting to fetch history for tracking ID: ${trackingId}`);
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
            .then(trackingData => {
                const historyEvents = trackingData.history;
                const ul = trackingHistoryList.querySelector('ul');
                if (!ul) return;
                ul.innerHTML = '';
                if (!historyEvents || historyEvents.length === 0) {
                    ul.innerHTML = '<li class="collection-item">No history events yet.</li>';
                    return;
                }

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
                attachHistoryButtonListeners();
            })
            .catch(error => {
                console.error('Error fetching tracking history:', error);
                const ul = trackingHistoryList.querySelector('ul');
                if (ul) {
                    ul.innerHTML = `<li class="collection-item red-text">Failed to load history: ${error.message}</li>`;
                }
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

                M.updateTextFields();
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
            const trackingMongoId = updateTrackingMongoId.value;

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
                        M.Datepicker.init(document.getElementById('newHistoryDate'));
                        M.Timepicker.init(document.getElementById('newHistoryTime'));
                        fetchTrackingHistory(trackingMongoId);
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
                        fetchTrackingHistory(trackingMongoId);
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

    function populateTrackingHistory(historyData) {
    // A quick check to make sure the element exists
    if (historyEventsList) {
        historyEventsList.innerHTML = ''; // Clear previous content

        historyData.forEach(event => {
            const li = document.createElement('li');
            li.className = 'collection-item'; // Add Materialize class
            li.innerHTML = `
                <div class="history-content">
                    <p><strong>${event.location}</strong> on ${event.date} at ${event.time}</p>
                    <p>${event.description}</p>
                </div>
                <div class="history-actions">
                    <button class="btn-small blue darken-2 edit-history-btn" data-id="${event._id}">Edit</button>
                    <button class="btn-small red darken-2 delete-history-btn" data-id="${event._id}">Delete</button>
                </div>
            `;
            historyEventsList.appendChild(li);
        });
    } else {
        console.error('Error: The historyEvents list element was not found in the DOM.');
    }
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


    // --- Placeholder functions for populating dropdowns (assuming they are in your backend) ---
    function fetchTrackingIdsForSelect() {}
    function fetchTrackingIdsForEmailSelect() {}
    function fetchTrackingIdsForAttachFileSelect() {}


    // --- Initial setup on page load ---
    showSection('dashboard-section');
    fetchAllTrackings();
    fetchTrackingIdsForSelect();
    fetchTrackingIdsForEmailSelect();
    fetchTrackingIdsForAttachFileSelect();

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
