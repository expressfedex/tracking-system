document.addEventListener('DOMContentLoaded', () => {
    // --- Materialize Component Initializations ---
    M.Modal.init(document.querySelectorAll('.modal'));
    M.FormSelect.init(document.querySelectorAll('select'));
    M.Datepicker.init(document.querySelectorAll('.datepicker'));
    M.Timepicker.init(document.querySelectorAll('.timepicker'));

    // --- DOM Element References ---
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const navLinks = document.querySelectorAll('.sidebar nav ul li a');
    const sections = document.querySelectorAll('.content-section');
    const sidebarListItems = document.querySelectorAll('.sidebar nav ul li');

    // Tracking Management
    const addTrackingForm = document.getElementById('addTrackingForm');
    const trackingsTableBody = document.getElementById('trackingsTableBody');
    const updateTrackingForm = document.getElementById('updateTrackingForm');
    const updateTrackingMongoId = document.getElementById('updateTrackingMongoId'); // Hidden input for mongoId
    const trackingIdSelect = document.getElementById('trackingIdSelect'); // For update/delete forms
    const deleteTrackingModalTrigger = document.getElementById('deleteTrackingModal'); // Modal for delete confirmation
    const confirmDeleteTrackingBtn = document.getElementById('confirmDeleteTrackingBtn');
    const trackingIdToDeleteInput = document.getElementById('trackingIdToDelete');
    const trackingIdPlaceholder = document.getElementById('trackingIdPlaceholder');

    // History Management
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


    // Email Notification
    const sendEmailForm = document.getElementById('sendEmailForm');
    const emailTrackingIdSelect = document.getElementById('emailTrackingIdSelect');
    const notificationEmail = document.getElementById('notificationEmail');
    const emailSubject = document.getElementById('emailSubject');
    const notificationMessage = document.getElementById('notificationMessage');
    const emailAttachmentFileUpload = document.getElementById('emailAttachmentFileUpload');

    // File Upload
    const uploadPackageFileForm = document.getElementById('uploadPackageFileForm');
    const attachFileTrackingIdSelect = document.getElementById('attachFileTrackingIdSelect');
    const packageFileInput = document.getElementById('packageFileInput');

    // User Management
    const usersTableBody = document.getElementById('usersTableBody');
    const createUserForm = document.getElementById('createUserForm');
    const createUserModal = document.getElementById('createUserModal');
    const editUserModal = document.getElementById('editUserModal');
    const editUserForm = document.getElementById('editUserForm');
    const deleteUserModalTrigger = document.getElementById('deleteUserModal');
    const deleteUserBtn = document.getElementById('deleteUserBtn');
    const userIdToDeleteInput = document.getElementById('userIdToDelete');
    const usernameToDelete = document.getElementById('usernameToDelete');

    // Dashboard Stats
    const totalPackages = document.getElementById('totalPackages');
    const deliveredPackages = document.getElementById('deliveredPackages');
    const inTransitPackages = document.getElementById('inTransitPackages');
    const pendingPackages = document.getElementById('pendingPackages');
    const exceptionsPackages = document.getElementById('exceptionsPackages');


    // --- Helper Functions ---
    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.remove('active-section');
        });
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active-section');
        } else {
            console.error(`Target section with ID '${sectionId}' not found.`);
        }

        // Update active state in sidebar navigation
        sidebarListItems.forEach(item => {
            item.classList.remove('active');
        });
        const activeLink = document.querySelector(`.sidebar nav ul li a[data-section="${sectionId}"]`);
        if (activeLink) {
            activeLink.closest('li').classList.add('active');
        }

        // Close sidebar on small screens after navigating
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            mainContent.classList.remove('pushed');
            menuToggle.classList.remove('active');
        }
    }

    // --- Authentication Check ---
    // Redirect to login if no token is found
    const token = localStorage.getItem('token');
    if (!token) {
        M.toast({ html: 'No session found. Please log in.', classes: 'red darken-2' });
        setTimeout(() => window.location.href = 'admin_login.html', 1500);
        return; // Stop execution if not authenticated
    }


    // --- Tracking Management Functions ---

    // Fetch All Trackings
    function fetchAllTrackings() {
        fetch('/api/admin/trackings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
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
                if (trackingsTableBody) {
                    trackingsTableBody.innerHTML = ''; // Clear existing rows
                    if (trackings.length === 0) {
                        trackingsTableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px;">No trackings found.</td></tr>';
                        return;
                    }
                    trackings.forEach(tracking => {
                        const row = document.createElement('tr');
                        const statusClass = getStatusColorClass(tracking.status || '');
                        row.innerHTML = `
                            <td>${tracking.trackingId}</td>
                            <td>${tracking.shipperName}</td>
                            <td>${tracking.recipientName}</td>
                            <td>${tracking.origin}</td>
                            <td>${tracking.destination}</td>
                            <td>${new Date(tracking.shipmentDate).toLocaleDateString()}</td>
                            <td>${tracking.expectedDeliveryDate ? new Date(tracking.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</td>
                            <td><span class="status-badge ${statusClass}">${tracking.status}</span></td>
                            <td>${tracking.currentLocation || 'N/A'}</td>
                            <td>
                                <button class="btn btn-small waves-effect waves-light green darken-1 view-history-btn" data-id="${tracking._id}"><i class="material-icons">history</i></button>
                                <button class="btn btn-small waves-effect waves-light blue darken-1 edit-tracking-btn" data-id="${tracking._id}"><i class="material-icons">edit</i></button>
                                <button class="btn btn-small waves-effect waves-light red darken-2 delete-tracking-modal-trigger" data-id="${tracking.trackingId}" data-mongo-id="${tracking._id}"><i class="material-icons">delete</i></button>
                            </td>
                        `;
                        trackingsTableBody.appendChild(row);
                    });

                    // Attach event listeners for dynamically created buttons
                    document.querySelectorAll('.view-history-btn').forEach(button => {
                        button.addEventListener('click', function() {
                            const mongoId = this.dataset.id;
                            fetchTrackingHistory(mongoId);
                            M.Modal.getInstance(document.getElementById('historyModal')).open();
                        });
                    });

                    document.querySelectorAll('.edit-tracking-btn').forEach(button => {
                        button.addEventListener('click', function() {
                            const mongoId = this.dataset.id;
                            fetchTrackingDetails(mongoId); // Fetch details using mongoId
                            showSection('update-tracking-section'); // Show the update form
                        });
                    });

                    document.querySelectorAll('.delete-tracking-modal-trigger').forEach(button => {
                        button.addEventListener('click', function() {
                            const trackingId = this.dataset.id;
                            const mongoId = this.dataset.mongoId;
                            trackingIdToDeleteInput.value = mongoId; // Set the MongoDB ID to the hidden input
                            if (trackingIdPlaceholder) trackingIdPlaceholder.textContent = trackingId; // Display human-readable ID
                            M.Modal.getInstance(deleteTrackingModalTrigger).open();
                        });
                    });
                }
                updateDashboardStats(trackings); // Update dashboard stats after fetching
            })
            .catch(error => {
                console.error('Error fetching trackings:', error);
                if (trackingsTableBody) {
                    trackingsTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: red;">Failed to load trackings: ${error.message}</td></tr>`;
                }
                M.toast({ html: `Failed to load trackings: ${error.message}`, classes: 'red darken-2' });
            });
    }

    // Populate Tracking ID dropdowns
    function fetchTrackingIdsForSelect() {
        fetch('/api/admin/trackings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => response.json())
            .then(trackings => {
                // For Update/Delete Tracking section
                if (trackingIdSelect) {
                    trackingIdSelect.innerHTML = '<option value="" disabled selected>Select Tracking ID</option>';
                    trackings.forEach(tracking => {
                        const option = document.createElement('option');
                        option.value = tracking._id; // Use MongoDB ID as value
                        option.textContent = tracking.trackingId; // Display human-readable ID
                        trackingIdSelect.appendChild(option);
                    });
                    M.FormSelect.init(trackingIdSelect); // Re-initialize Materialize Select
                }
            })
            .catch(error => {
                console.error('Error fetching tracking IDs for select:', error);
                M.toast({ html: `Error populating tracking IDs: ${error.message}`, classes: 'red darken-2' });
            });
    }

    // Populate Tracking IDs for Email Notification
    function fetchTrackingIdsForEmailSelect() {
        fetch('/api/admin/trackings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => response.json())
            .then(trackings => {
                if (emailTrackingIdSelect) {
                    emailTrackingIdSelect.innerHTML = '<option value="" disabled selected>Select Tracking ID</option>';
                    trackings.forEach(tracking => {
                        const option = document.createElement('option');
                        option.value = tracking.trackingId; // Use human-readable tracking ID for email pre-fill
                        option.textContent = tracking.trackingId;
                        emailTrackingIdSelect.appendChild(option);
                    });
                    M.FormSelect.init(emailTrackingIdSelect);
                }
            })
            .catch(error => {
                console.error('Error fetching tracking IDs for email select:', error);
                M.toast({ html: `Error populating email tracking IDs: ${error.message}`, classes: 'red darken-2' });
            });
    }

    // Populate Tracking IDs for Attach File
    function fetchTrackingIdsForAttachFileSelect() {
        fetch('/api/admin/trackings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => response.json())
            .then(trackings => {
                if (attachFileTrackingIdSelect) {
                    attachFileTrackingIdSelect.innerHTML = '<option value="" disabled selected>Select Tracking ID</option>';
                    trackings.forEach(tracking => {
                        const option = document.createElement('option');
                        option.value = tracking.trackingId; // Use human-readable tracking ID for file attachment
                        option.textContent = tracking.trackingId;
                        attachFileTrackingIdSelect.appendChild(option);
                    });
                    M.FormSelect.init(attachFileTrackingIdSelect);
                }
            })
            .catch(error => {
                console.error('Error fetching tracking IDs for file attach select:', error);
                M.toast({ html: `Error populating file attach tracking IDs: ${error.message}`, classes: 'red darken-2' });
            });
    }

    // Add Tracking Form Submission
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
                recipientPhone: document.getElementById('newRecipientPhone').value,
                origin: document.getElementById('newOrigin').value,
                destination: document.getElementById('newDestination').value,
                shipmentDate: document.getElementById('newShipmentDate').value,
                expectedDeliveryDate: document.getElementById('newExpectedDeliveryDate').value,
                status: document.getElementById('newStatus').value,
                currentLocation: document.getElementById('newCurrentLocation').value,
                packageDescription: document.getElementById('newPackageDescription').value,
                weight: document.getElementById('newWeight').value,
                dimensions: document.getElementById('newDimensions').value,
                carrier: document.getElementById('newCarrier').value,
                serviceType: document.getElementById('newServiceType').value,
                // Do not include 'history' here, it's added separately
                // Do not include 'files' here, they are uploaded separately
            };

            fetch('/api/admin/trackings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newTracking)
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
                        M.updateTextFields();
                        M.Datepicker.init(document.getElementById('newShipmentDate'));
                        M.Datepicker.init(document.getElementById('newExpectedDeliveryDate'));
                        M.FormSelect.init(document.getElementById('newStatus'));
                        fetchAllTrackings(); // Refresh the table and stats
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

    // Fetch Tracking Details for Editing
    if (trackingIdSelect) {
        trackingIdSelect.addEventListener('change', function() {
            const mongoId = this.value;
            if (mongoId) {
                fetchTrackingDetails(mongoId);
            } else {
                // Clear the form if no tracking ID is selected
                updateTrackingForm.reset();
                M.updateTextFields();
                M.Datepicker.init(document.getElementById('updateShipmentDate'));
                M.Datepicker.init(document.getElementById('updateExpectedDeliveryDate'));
                M.FormSelect.init(document.getElementById('updateStatus'));
                updateTrackingMongoId.value = '';
                if (trackingHistoryList) {
                    const ul = trackingHistoryList.querySelector('ul');
                    if (ul) ul.innerHTML = '<li class="collection-item">Select a tracking to view history.</li>';
                }
            }
        });
    }

    function fetchTrackingDetails(mongoId) {
        fetch(`/api/admin/trackings/mongo/${mongoId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
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
                // Populate the update form fields
                updateTrackingMongoId.value = tracking._id; // Store MongoDB ID
                document.getElementById('updateTrackingId').value = tracking.trackingId || '';
                document.getElementById('updateShipperName').value = tracking.shipperName || '';
                document.getElementById('updateShipperAddress').value = tracking.shipperAddress || '';
                document.getElementById('updateRecipientName').value = tracking.recipientName || '';
                document.getElementById('updateRecipientAddress').value = tracking.recipientAddress || '';
                document.getElementById('updateRecipientEmail').value = tracking.recipientEmail || '';
                document.getElementById('updateRecipientPhone').value = tracking.recipientPhone || '';
                document.getElementById('updateOrigin').value = tracking.origin || '';
                document.getElementById('updateDestination').value = tracking.destination || '';
                document.getElementById('updateShipmentDate').value = tracking.shipmentDate ? new Date(tracking.shipmentDate).toISOString().split('T')[0] : '';
                document.getElementById('updateExpectedDeliveryDate').value = tracking.expectedDeliveryDate ? new Date(tracking.expectedDeliveryDate).toISOString().split('T')[0] : '';
                document.getElementById('updateStatus').value = tracking.status || '';
                document.getElementById('updateCurrentLocation').value = tracking.currentLocation || '';
                document.getElementById('updatePackageDescription').value = tracking.packageDescription || '';
                document.getElementById('updateWeight').value = tracking.weight || '';
                document.getElementById('updateDimensions').value = tracking.dimensions || '';
                document.getElementById('updateCarrier').value = tracking.carrier || '';
                document.getElementById('updateServiceType').value = tracking.serviceType || '';

                // Update Materialize labels and re-initialize select/datepickers
                M.updateTextFields();
                M.Datepicker.init(document.getElementById('updateShipmentDate'));
                M.Datepicker.init(document.getElementById('updateExpectedDeliveryDate'));
                M.FormSelect.init(document.getElementById('updateStatus'));
                M.FormSelect.init(trackingIdSelect); // Ensure the select dropdown itself is re-initialized for visual update

                // Fetch and display history for this tracking
                fetchTrackingHistory(tracking._id);
            })
            .catch(error => {
                console.error('Error fetching tracking details:', error);
                M.toast({ html: `Failed to load tracking details: ${error.message}`, classes: 'red darken-2' });
                // Clear form in case of error
                updateTrackingForm.reset();
                M.updateTextFields();
                M.Datepicker.init(document.getElementById('updateShipmentDate'));
                M.Datepicker.init(document.getElementById('updateExpectedDeliveryDate'));
                M.FormSelect.init(document.getElementById('updateStatus'));
                updateTrackingMongoId.value = '';
                if (trackingHistoryList) {
                    const ul = trackingHistoryList.querySelector('ul');
                    if (ul) ul.innerHTML = `<li class="collection-item red-text">Error loading history: ${error.message}</li>`;
                }
            });
    }

    // Update Tracking Form Submission
    if (updateTrackingForm) {
        updateTrackingForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const mongoId = updateTrackingMongoId.value; // Get the MongoDB ID from the hidden input

            if (!mongoId) {
                M.toast({ html: 'Please select a tracking to update.', classes: 'red darken-2' });
                return;
            }

            const updatedTracking = {
                trackingId: document.getElementById('updateTrackingId').value,
                shipperName: document.getElementById('updateShipperName').value,
                shipperAddress: document.getElementById('updateShipperAddress').value,
                recipientName: document.getElementById('updateRecipientName').value,
                recipientAddress: document.getElementById('updateRecipientAddress').value,
                recipientEmail: document.getElementById('updateRecipientEmail').value,
                recipientPhone: document.getElementById('updateRecipientPhone').value,
                origin: document.getElementById('updateOrigin').value,
                destination: document.getElementById('updateDestination').value,
                shipmentDate: document.getElementById('updateShipmentDate').value,
                expectedDeliveryDate: document.getElementById('updateExpectedDeliveryDate').value,
                status: document.getElementById('updateStatus').value,
                currentLocation: document.getElementById('updateCurrentLocation').value,
                packageDescription: document.getElementById('updatePackageDescription').value,
                weight: document.getElementById('updateWeight').value,
                dimensions: document.getElementById('updateDimensions').value,
                carrier: document.getElementById('updateCarrier').value,
                serviceType: document.getElementById('updateServiceType').value,
            };

            fetch(`/api/admin/trackings/${mongoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedTracking)
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
                        // updateTrackingForm.reset(); // Don't reset, keep data for further edits
                        M.updateTextFields();
                        M.Datepicker.init(document.getElementById('updateShipmentDate'));
                        M.Datepicker.init(document.getElementById('updateExpectedDeliveryDate'));
                        M.FormSelect.init(document.getElementById('updateStatus'));
                        fetchAllTrackings(); // Refresh the table and stats
                        fetchTrackingIdsForSelect(); // Refresh dropdowns
                        fetchTrackingIdsForEmailSelect();
                        fetchTrackingIdsForAttachFileSelect();
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
    if (confirmDeleteTrackingBtn) {
        confirmDeleteTrackingBtn.addEventListener('click', function() {
            const mongoId = trackingIdToDeleteInput.value; // Get the MongoDB ID

            // Client-side validation: Ensure mongoId is a non-empty string
            if (!mongoId || typeof mongoId !== 'string' || mongoId.trim().length === 0) {
                M.toast({ html: 'Error: Cannot delete. Tracking ID is missing or invalid.', classes: 'red darken-2' });
                console.error('Client-side validation failed: mongoId is', mongoId);
                M.Modal.getInstance(deleteTrackingModalTrigger).close();
                return; // Stop the function execution
            }

            fetch(`/api/admin/trackings/${mongoId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
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
                        M.Modal.getInstance(deleteTrackingModalTrigger).close(); // Close the modal
                        fetchAllTrackings(); // Refresh the table and stats
                        fetchTrackingIdsForSelect(); // Refresh dropdowns
                        fetchTrackingIdsForEmailSelect();
                        fetchTrackingIdsForAttachFileSelect();
                        // Clear the update form if the deleted tracking was currently displayed
                        if (updateTrackingMongoId.value === mongoId) {
                            updateTrackingForm.reset();
                            M.updateTextFields();
                            M.Datepicker.init(document.getElementById('updateShipmentDate'));
                            M.Datepicker.init(document.getElementById('updateExpectedDeliveryDate'));
                            M.FormSelect.init(document.getElementById('updateStatus'));
                            updateTrackingMongoId.value = '';
                            if (trackingHistoryList) {
                                const ul = trackingHistoryList.querySelector('ul');
                                if (ul) ul.innerHTML = '<li class="collection-item">Select a tracking to view history.</li>';
                            }
                        }
                    } else {
                        M.toast({ html: `Error: ${data.message || 'Could not delete tracking.'}`, classes: 'red darken-2' });
                    }
                })
                .catch(error => {
                    console.error('Error deleting tracking:', error);
                    M.toast({ html: `Network error or server issue: ${error.message}`, classes: 'red darken-2' });
                    M.Modal.getInstance(deleteTrackingModalTrigger).close(); // Ensure modal closes on error
                });
        });
    }


    // --- History Management ---
    function fetchTrackingHistory(mongoId) {
        fetch(`/api/admin/trackings/mongo/${mongoId}`, { // <-- Corrected to use /mongo/:id endpoint
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
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
                const historyEvents = trackingData.history; // <--- Correctly extract the history array here!

                const ul = trackingHistoryList.querySelector('ul');
                if (ul) ul.innerHTML = ''; // Clear previous history

                if (!historyEvents || historyEvents.length === 0) {
                    if (ul) ul.innerHTML = '<li class="collection-item">No history events yet.</li>';
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
                    if (ul) ul.appendChild(li);
                });
                attachHistoryButtonListeners(); // Attach listeners after new history items are added
            })
            .catch(error => {
                console.error('Error fetching tracking history:', error);
                M.toast({ html: error.message || 'Failed to load tracking history.', classes: 'red darken-2' });
                const ul = trackingHistoryList.querySelector('ul');
                if (ul) ul.innerHTML = `<li class="collection-item red-text">Error loading history: ${error.message}</li>`;
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

                if (editHistoryModalTrackingMongoId) editHistoryModalTrackingMongoId.value = trackingMongoId;
                if (editHistoryModalHistoryId) editHistoryModalHistoryId.value = historyId;
                if (editHistoryDate) editHistoryDate.value = date;
                if (editHistoryTime) editHistoryTime.value = time;
                if (editHistoryLocation) editHistoryLocation.value = location;
                if (editHistoryDescription) editHistoryDescription.value = description;

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

            if (!trackingMongoId) {
                M.toast({ html: 'Please select a tracking to add history to.', classes: 'red darken-2' });
                return;
            }

            const newHistoryEvent = {
                timestamp: new Date(`${document.getElementById('newHistoryDate').value}T${document.getElementById('newHistoryTime').value}`).toISOString(),
                location: document.getElementById('newHistoryLocation').value,
                description: document.getElementById('newHistoryDescription').value
            };

            fetch(`/api/admin/trackings/${trackingMongoId}/history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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

            if (!trackingMongoId || !historyId) {
                M.toast({ html: 'Error: Missing Tracking ID or History ID.', classes: 'red darken-2' });
                return;
            }

            const updatedHistoryEvent = {
                timestamp: new Date(`${editHistoryDate.value}T${editHistoryTime.value}`).toISOString(),
                location: editHistoryLocation.value,
                description: editHistoryDescription.value
            };

            fetch(`/api/admin/trackings/${trackingMongoId}/history/${historyId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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
                'Authorization': `Bearer ${token}`
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
                    M.toast({ html: 'History event deleted successfully!', classes: 'green darken-2' }); // Changed to green for success
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
                    'Authorization': `Bearer ${token}`
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
                fetch(`/api/admin/trackings/${trackingId}`, { // Fetch by human-readable trackingId
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                    .then(response => {
                        if (!response.ok) {
                            if (response.status === 401 || response.status === 403) {
                                throw new Error('Session expired or unauthorized.');
                            }
                            return response.json().then(errorData => {
                                throw new Error(errorData.message || 'Failed to fetch tracking details for email pre-fill');
                            });
                        }
                        return response.json();
                    })
                    .then(tracking => {
                        if (notificationEmail) notificationEmail.value = tracking.recipientEmail || '';
                        if (emailSubject) emailSubject.value = `Update on your FedEx Shipment: ${tracking.trackingId}`;
                        if (notificationMessage) notificationMessage.value = `Dear ${tracking.recipientName || 'customer'},\n\nYour shipment with tracking ID ${tracking.trackingId} is currently "${tracking.status}".\n\nLatest update: ${tracking.status} at ${new Date().toLocaleString()}.\n\nExpected delivery: ${tracking.expectedDeliveryDate ? new Date(tracking.expectedDeliveryDate).toLocaleDateString() : 'N/A'}.\n\nThank you for choosing FedEx.`;
                        M.updateTextFields(); // Update Materialize labels
                    })
                    .catch(error => {
                        console.error('Error pre-filling email:', error);
                        M.toast({ html: `Could not pre-fill email: ${error.message}`, classes: 'red darken-2' });
                        // Clear fields if pre-fill fails
                        if (notificationEmail) notificationEmail.value = '';
                        if (emailSubject) emailSubject.value = '';
                        if (notificationMessage) notificationMessage.value = '';
                        M.updateTextFields();
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
                    'Authorization': `Bearer ${token}`
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
                'Authorization': `Bearer ${token}`
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
                            if (userIdToDeleteInput) userIdToDeleteInput.value = userId;
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
                    'Authorization': `Bearer ${token}`
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
                        M.FormSelect.init(document.querySelectorAll('#createUserModal select')); // Re-init selects
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

    // Fetch User Details for Edit
    function fetchUserDetails(userId) {
        fetch(`/api/admin/users/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
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
                M.FormSelect.init(document.querySelectorAll('#editUserModal select')); // Re-init select
                M.Modal.getInstance(editUserModal).open();
            })
            .catch(error => {
                console.error('Error fetching user details:', error);
                M.toast({ html: `Failed to load user details: ${error.message}`, classes: 'red darken-2' });
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
                    'Authorization': `Bearer ${token}`
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

    // Delete User
    if (deleteUserBtn) {
        deleteUserBtn.addEventListener('click', function() {
            const userId = userIdToDeleteInput.value.trim(); // Trim whitespace from the ID

            // Add client-side validation for userId
            if (!userId || userId.length === 0) {
                M.toast({ html: 'Error: User ID is missing or invalid. Cannot delete.', classes: 'red darken-2' });
                console.error('Client-side validation failed: User ID is', userId);
                M.Modal.getInstance(deleteUserModalTrigger).close(); // Close modal if validation fails
                return; // Stop the function
            }

            fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(response => {
                    if (!response.ok) {
                        if (response.status === 401 || response.status === 403) {
                            M.toast({ html: 'Session expired or unauthorized. Please log in again.', classes: 'red darken-2' });
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
                        M.toast({ html: 'User deleted successfully!', classes: 'green darken-2' }); // Changed to green for success messages
                        M.Modal.getInstance(deleteUserModalTrigger).close(); // Correctly close the modal
                        fetchAllUsers(); // Refresh the user list
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
        const delivered = trackings.filter(t => t.status && t.status.toLowerCase().includes('delivered')).length;
        const inTransit = trackings.filter(t => t.status && t.status.toLowerCase().includes('in transit')).length;
        const pending = trackings.filter(t => t.status && (t.status.toLowerCase().includes('pending') || t.status.toLowerCase().includes('on hold'))).length;
        const exceptions = trackings.filter(t => t.status && (t.status.toLowerCase().includes('exception') || t.status.toLowerCase().includes('delay'))).length;

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


    // --- Initial Load Logic ---
    // This code ensures the dashboard is shown and the link is active when the page first loads.
    // It should run only once when the DOM is fully loaded.
    // Initial load: show dashboard and fetch all trackings to populate stats
    showSection('dashboard-section');
    fetchAllTrackings(); // This will also call updateDashboardStats
    fetchTrackingIdsForSelect(); // Populate initial dropdowns
    fetchTrackingIdsForEmailSelect();
    fetchTrackingIdsForAttachFileSelect();
    fetchAllUsers(); // Fetch users on initial load for user management section


    // --- Sidebar Toggle Logic ---
    if (menuToggle && sidebar && mainContent) { // Ensure all elements are found
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active'); // Toggle the 'active' class on the sidebar
            mainContent.classList.toggle('pushed'); // Toggle the 'pushed' class on the main content
            menuToggle.classList.toggle('active'); // Optional: Toggle active class on menu toggle itself if it moves
        });
    } else {
        console.error("Sidebar, menu toggle button, or main content not found in the DOM.");
    }


    // --- Content Section Switching Logic ---
    // This block handles clicking on the links *inside* the sidebar to switch content.
    // It is separate from the sidebar toggle logic.
    if (navLinks.length > 0 && sections.length > 0) {
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault(); // Prevent the default anchor link behavior

                const targetSectionId = this.dataset.section;
                showSection(targetSectionId); // Use the centralized showSection function

                // Specific actions for each section load
                if (targetSectionId === 'trackings-section') {
                    fetchAllTrackings();
                } else if (targetSectionId === 'add-tracking-section') {
                    // No specific fetch needed, form is ready
                } else if (targetSectionId === 'update-delete-tracking-section') {
                    fetchTrackingIdsForSelect(); // Re-populate dropdown on section entry
                    // Clear the update form and history when navigating to this section
                    if (updateTrackingForm) {
                        updateTrackingForm.reset();
                        M.updateTextFields();
                        M.Datepicker.init(document.getElementById('updateShipmentDate'));
                        M.Datepicker.init(document.getElementById('updateExpectedDeliveryDate'));
                        M.FormSelect.init(document.getElementById('updateStatus'));
                        updateTrackingMongoId.value = '';
                    }
                    if (trackingHistoryList) {
                        const ul = trackingHistoryList.querySelector('ul');
                        if (ul) ul.innerHTML = '<li class="collection-item">Select a tracking to view history.</li>';
                    }
                } else if (targetSectionId === 'email-notification-section') {
                    fetchTrackingIdsForEmailSelect();
                } else if (targetSectionId === 'upload-file-section') {
                    fetchTrackingIdsForAttachFileSelect();
                } else if (targetSectionId === 'user-management-section') {
                    fetchAllUsers(); // Refresh user list when entering this section
                }
            });
        });
    } else {
        console.warn("No navigation links or content sections found for dynamic switching.");
    }

}); // End of DOMContentLoaded
