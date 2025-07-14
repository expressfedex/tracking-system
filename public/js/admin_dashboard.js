document.addEventListener('DOMContentLoaded', function() {
    M.AutoInit(); // Initialize Materialize components

    // Get username from local storage or set default
    const adminUsername = localStorage.getItem('adminUsername') || 'Admin';
    document.getElementById('adminUsername').textContent = adminUsername;
    document.getElementById('headerUsername').textContent = adminUsername;

    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    const sections = document.querySelectorAll('.dashboard-section');
    const sidebarLinks = document.querySelectorAll('.sidebar a');

    // Function to show a specific section and hide others
    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.remove('active-section');
            if (section.id === sectionId) {
                section.classList.add('active-section');
            }
        });
        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionId) {
                link.classList.add('active');
            }
        });
        // If sidebar is open on mobile, close it
        if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            menuToggle.classList.remove('active');
        }
    }

    // Event listener for sidebar links
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.dataset.section;
            showSection(sectionId);

            // Specific actions for sections
            if (sectionId === 'manage-tracking-section') {
                fetchTrackingIdsForSelect(); // Populate the select dropdown
                document.getElementById('updateTrackingForm').style.display = 'none'; // Hide form until an ID is selected
                document.getElementById('trackingHistoryList').querySelector('ul').innerHTML = ''; // Clear history
                M.updateTextFields(); // Important for Materialize labels to adjust
            } else if (sectionId === 'all-trackings-section') {
                fetchAllTrackings(); // Load all trackings into the table
            } else if (sectionId === 'communication-center-section') {
                fetchTrackingIdsForEmailSelect(); // Populate select for email form
                M.updateTextFields(); // Important for Materialize labels to adjust
            } else if (sectionId === 'add-tracking-section') {
                // Reinitialize date/time pickers for the "add" form
                initDatePickers();
                initTimePickers();
                M.updateTextFields();
            }
        });
    });

    // Toggle sidebar for mobile
    menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
        this.classList.toggle('active');
    });

    // Logout Button
    document.getElementById('logoutBtn').addEventListener('click', function() {
        if (confirm('Are you sure you want to log out?')) {
            localStorage.removeItem('adminUsername'); // Clear stored username
            // Redirect to login page or perform actual logout
            window.location.href = '/admin_login.html'; // Assuming you have a login page
        }
    });

    // Initialize date and time pickers
    function initDatePickers() {
        const datepickers = document.querySelectorAll('.datepicker');
        M.Datepicker.init(datepickers, {
            format: 'yyyy-mm-dd',
            showClearBtn: true
        });
    }

    function initTimePickers() {
        const timepickers = document.querySelectorAll('.timepicker');
        M.Timepicker.init(timepickers, {
            twelveHour: false, // Use 24-hour format
            showClearBtn: true
        });
    }

    initDatePickers();
    initTimePickers();


    // --- Status Indicator Logic (Add Tracking) ---
    const addStatusInput = document.getElementById('addStatus');
    const addStatusCircle = document.getElementById('addStatusCircle');
    const addIsBlinkingCheckbox = document.getElementById('addIsBlinking');

    function updateAddStatusIndicator() {
        const status = addStatusInput.value.toLowerCase().trim();
        addStatusCircle.className = 'status-circle'; // Reset classes

        if (status.includes('delivered')) {
            addStatusCircle.classList.add('delivered');
        } else if (status.includes('in transit')) {
            addStatusCircle.classList.add('in-transit');
        } else if (status.includes('pending') || status.includes('on hold')) {
            addStatusCircle.classList.add('pending');
        } else if (status.includes('exception') || status.includes('delay')) {
            addStatusCircle.classList.add('exception');
        } else {
            addStatusCircle.classList.add('unknown'); // Default grey for unknown status
        }

        // Apply blinking class if checked
        if (addIsBlinkingCheckbox.checked) {
            addStatusCircle.classList.add('blinking');
        } else {
            addStatusCircle.classList.remove('blinking');
        }
    }

    addStatusInput.addEventListener('input', updateAddStatusIndicator);
    addIsBlinkingCheckbox.addEventListener('change', updateAddStatusIndicator);
    updateAddStatusIndicator(); // Initial call to set status indicator on load

    // --- Status Indicator Logic (Update Tracking) ---
    const updateStatusInput = document.getElementById('updateStatus');
    const updateStatusCircle = document.getElementById('updateStatusCircle');
    const updateIsBlinkingCheckbox = document.getElementById('updateIsBlinkingOriginal'); // Note: Corrected ID in HTML

    function updateUpdateStatusIndicator() {
        if (!updateStatusInput || !updateStatusCircle || !updateIsBlinkingCheckbox) return;

        const status = updateStatusInput.value.toLowerCase().trim();
        updateStatusCircle.className = 'status-circle'; // Reset classes

        if (status.includes('delivered')) {
            updateStatusCircle.classList.add('delivered');
        } else if (status.includes('in transit')) {
            updateStatusCircle.classList.add('in-transit');
        } else if (status.includes('pending') || status.includes('on hold')) {
            updateStatusCircle.classList.add('pending');
        } else if (status.includes('exception') || status.includes('delay')) {
            updateStatusCircle.classList.add('exception');
        } else {
            updateStatusCircle.classList.add('unknown'); // Default grey for unknown status
        }

        // Apply blinking class if checked
        if (updateIsBlinkingCheckbox.checked) {
            updateStatusCircle.classList.add('blinking');
        } else {
            updateStatusCircle.classList.remove('blinking');
        }
    }

    if (updateStatusInput && updateStatusCircle && updateIsBlinkingCheckbox) {
        updateStatusInput.addEventListener('input', updateUpdateStatusIndicator);
        updateIsBlinkingCheckbox.addEventListener('change', updateUpdateStatusIndicator);
    }


    // --- CRUD Operations ---

    // 1. Add New Tracking
    document.getElementById('addTrackingForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = {
            trackingId: document.getElementById('addTrackingId').value,
            status: document.getElementById('addStatus').value,
            isBlinking: document.getElementById('addIsBlinking').checked,
            statusLineColor: document.getElementById('addStatusLineColor').value,
            blinkingDotColor: document.getElementById('addBlinkingDotColor').value,
            senderName: document.getElementById('addSenderName').value,
            recipientName: document.getElementById('addRecipientName').value,
            // recipientEmail: document.getElementById('addRecipientEmail').value, // REMOVED
            packageContents: document.getElementById('addPackageContents').value,
            serviceType: document.getElementById('addServiceType').value,
            recipientAddress: document.getElementById('addRecipientAddress').value,
            specialHandling: document.getElementById('addSpecialHandling').value,
            expectedDeliveryDate: document.getElementById('addExpectedDeliveryDate').value,
            expectedDeliveryTime: document.getElementById('addExpectedDeliveryTime').value,
            origin: document.getElementById('addOrigin').value,
            destination: document.getElementById('addDestination').value,
            weight: parseFloat(document.getElementById('addWeight').value),
            trackingHistory: [] // New tracking starts with an empty history
        };

        fetch('/api/trackings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    M.toast({
                        html: 'Tracking added successfully!',
                        classes: 'green darken-2'
                    });
                    document.getElementById('addTrackingForm').reset();
                    updateAddStatusIndicator(); // Reset status indicator visuals
                    // Optionally, refresh 'Manage All Trackings' table
                    // fetchAllTrackings();
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
                    html: 'Network error or server issue.',
                    classes: 'red darken-2'
                });
            });
    });

    // 2. Manage Single Tracking - Populate Select Dropdown
    const singleTrackingIdSelect = document.getElementById('singleTrackingIdSelect');

    function fetchTrackingIdsForSelect() {
        fetch('/api/trackings')
            .then(response => response.json())
            .then(trackings => {
                singleTrackingIdSelect.innerHTML = '<option value="" disabled selected>Select Tracking ID</option>';
                trackings.forEach(tracking => {
                    const option = document.createElement('option');
                    option.value = tracking._id; // Use MongoDB _id for internal management
                    option.textContent = tracking.trackingId; // Display trackingId to user
                    option.dataset.trackingData = JSON.stringify(tracking); // Store full tracking data
                    singleTrackingIdSelect.appendChild(option);
                });
                M.FormSelect.init(singleTrackingIdSelect); // Re-initialize Materialize select
            })
            .catch(error => console.error('Error fetching tracking IDs:', error));
    }

    singleTrackingIdSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        if (selectedOption.value) {
            const trackingData = JSON.parse(selectedOption.dataset.trackingData);
            populateUpdateForm(trackingData);
            document.getElementById('updateTrackingForm').style.display = 'block';
            updateUpdateStatusIndicator(); // Update status indicator for loaded data
            M.updateTextFields(); // Important for Materialize labels to adjust for populated fields
        } else {
            document.getElementById('updateTrackingForm').style.display = 'none';
        }
    });

    function populateUpdateForm(tracking) {
        document.getElementById('updateTrackingMongoId').value = tracking._id;
        document.getElementById('updateTrackingId').value = tracking.trackingId;
        document.getElementById('updateStatus').value = tracking.status;
        document.getElementById('updateIsBlinkingOriginal').checked = tracking.isBlinking || false;
        document.getElementById('updateStatusLineColor').value = tracking.statusLineColor || '#2196F3';
        document.getElementById('updateBlinkingDotColor').value = tracking.blinkingDotColor || '#FFFFFF';
        document.getElementById('updateSenderName').value = tracking.senderName;
        document.getElementById('updateRecipientName').value = tracking.recipientName;
        // document.getElementById('updateRecipientEmail').value = tracking.recipientEmail; // REMOVED
        document.getElementById('updatePackageContents').value = tracking.packageContents;
        document.getElementById('updateServiceType').value = tracking.serviceType;
        document.getElementById('updateRecipientAddress').value = tracking.recipientAddress;
        document.getElementById('updateSpecialHandling').value = tracking.specialHandling;
        document.getElementById('updateExpectedDeliveryDate').value = tracking.expectedDeliveryDate;
        document.getElementById('updateExpectedDeliveryTime').value = tracking.expectedDeliveryTime;
        document.getElementById('updateOrigin').value = tracking.origin;
        document.getElementById('updateDestination').value = tracking.destination;
        document.getElementById('updateWeight').value = tracking.weight;

        // Re-initialize date and time pickers for update form
        initDatePickers();
        initTimePickers();

        renderTrackingHistory(tracking.trackingHistory || []);
        updateUpdateStatusIndicator(); // Ensure visual indicator is set after population
        M.updateTextFields(); // Relabel inputs for Materialize
    }

    // 2.1 Update Tracking Details
    document.getElementById('updateTrackingForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const mongoId = document.getElementById('updateTrackingMongoId').value;
        const updatedData = {
            trackingId: document.getElementById('updateTrackingId').value,
            status: document.getElementById('updateStatus').value,
            isBlinking: document.getElementById('updateIsBlinkingOriginal').checked,
            statusLineColor: document.getElementById('updateStatusLineColor').value,
            blinkingDotColor: document.getElementById('updateBlinkingDotColor').value,
            senderName: document.getElementById('updateSenderName').value,
            recipientName: document.getElementById('updateRecipientName').value,
            // recipientEmail: document.getElementById('updateRecipientEmail').value, // REMOVED
            packageContents: document.getElementById('updatePackageContents').value,
            serviceType: document.getElementById('updateServiceType').value,
            recipientAddress: document.getElementById('updateRecipientAddress').value,
            specialHandling: document.getElementById('updateSpecialHandling').value,
            expectedDeliveryDate: document.getElementById('updateExpectedDeliveryDate').value,
            expectedDeliveryTime: document.getElementById('updateExpectedDeliveryTime').value,
            origin: document.getElementById('updateOrigin').value,
            destination: document.getElementById('updateDestination').value,
            weight: parseFloat(document.getElementById('updateWeight').value),
        };

        fetch(`/api/trackings/${mongoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    M.toast({
                        html: 'Tracking updated successfully!',
                        classes: 'blue darken-2'
                    });
                    fetchTrackingIdsForSelect(); // Refresh dropdown
                    // Also refresh the 'all trackings' table if visible
                    if (document.getElementById('all-trackings-section').classList.contains('active-section')) {
                        fetchAllTrackings();
                    }
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
                    html: 'Network error or server issue.',
                    classes: 'red darken-2'
                });
            });
    });

    // 2.2 Tracking History Management (Add, Edit, Delete)
    function renderTrackingHistory(history) {
        const historyList = document.getElementById('trackingHistoryList').querySelector('ul');
        historyList.innerHTML = '';
        if (history && history.length > 0) {
            history.sort((a, b) => new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`)); // Sort by date/time desc
            history.forEach((event, index) => {
                const li = document.createElement('li');
                li.classList.add('collection-item');
                li.innerHTML = `
                    <div class="history-content">
                        <strong>${event.date} ${event.time}</strong> - ${event.location ? `${event.location}: ` : ''}${event.description}
                    </div>
                    <div class="history-actions">
                        <button class="btn-small waves-effect waves-light blue edit-history-btn"
                                data-index="${index}"
                                data-id="${event._id || ''}"
                                data-date="${event.date}"
                                data-time="${event.time}"
                                data-location="${event.location || ''}"
                                data-description="${event.description}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-small waves-effect waves-light red delete-history-btn" data-id="${event._id || ''}" data-index="${index}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                historyList.appendChild(li);
            });
        } else {
            historyList.innerHTML = '<li class="collection-item">No history events yet.</li>';
        }

        // Attach event listeners to new buttons
        document.querySelectorAll('.edit-history-btn').forEach(button => {
            button.addEventListener('click', openEditHistoryModal);
        });
        document.querySelectorAll('.delete-history-btn').forEach(button => {
            button.addEventListener('click', deleteHistoryEvent);
        });
    }

    // Add History Event
    document.getElementById('addHistoryForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const trackingMongoId = document.getElementById('singleTrackingIdSelect').value;
        if (!trackingMongoId) {
            M.toast({
                html: 'Please select a tracking ID first.',
                classes: 'red darken-2'
            });
            return;
        }

        const newHistoryEvent = {
            date: document.getElementById('newHistoryDate').value,
            time: document.getElementById('newHistoryTime').value,
            location: document.getElementById('newHistoryLocation').value,
            description: document.getElementById('newHistoryDescription').value,
        };

        fetch(`/api/trackings/${trackingMongoId}/history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newHistoryEvent),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    M.toast({
                        html: 'History event added!',
                        classes: 'teal lighten-1'
                    });
                    document.getElementById('addHistoryForm').reset();
                    // Refresh current tracking's history
                    const selectedOption = singleTrackingIdSelect.options[singleTrackingIdSelect.selectedIndex];
                    const updatedTracking = JSON.parse(selectedOption.dataset.trackingData);
                    updatedTracking.trackingHistory = data.tracking.trackingHistory; // Get updated history from server
                    selectedOption.dataset.trackingData = JSON.stringify(updatedTracking); // Update stored data
                    renderTrackingHistory(updatedTracking.trackingHistory); // Re-render history
                    M.updateTextFields();
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
                    html: 'Network error or server issue.',
                    classes: 'red darken-2'
                });
            });
    });

    // Edit History Modal Logic
    const editHistoryModal = document.getElementById('editHistoryModal');
    const editHistoryModalInstance = M.Modal.init(editHistoryModal);
    const saveHistoryEditBtn = document.getElementById('saveHistoryEditBtn');

    function openEditHistoryModal(e) {
        const btn = e.currentTarget;
        const historyId = btn.dataset.id;
        const historyDate = btn.dataset.date;
        const historyTime = btn.dataset.time;
        const historyLocation = btn.dataset.location;
        const historyDescription = btn.dataset.description;

        document.getElementById('editHistoryModalTrackingMongoId').value = document.getElementById('singleTrackingIdSelect').value;
        document.getElementById('editHistoryModalHistoryId').value = historyId;
        document.getElementById('editHistoryDate').value = historyDate;
        document.getElementById('editHistoryTime').value = historyTime;
        document.getElementById('editHistoryLocation').value = historyLocation;
        document.getElementById('editHistoryDescription').value = historyDescription;

        // Re-initialize date and time pickers within the modal
        M.Datepicker.init(document.getElementById('editHistoryDate'), {
            format: 'yyyy-mm-dd',
            showClearBtn: true,
            defaultDate: new Date(historyDate),
            setDefaultDate: true
        });
        M.Timepicker.init(document.getElementById('editHistoryTime'), {
            twelveHour: false,
            showClearBtn: true,
            defaultTime: historyTime
        });

        M.updateTextFields(); // Relabel inputs for Materialize
        editHistoryModalInstance.open();
    }

    saveHistoryEditBtn.addEventListener('click', function() {
        const trackingMongoId = document.getElementById('editHistoryModalTrackingMongoId').value;
        const historyId = document.getElementById('editHistoryModalHistoryId').value;
        const updatedHistoryEvent = {
            date: document.getElementById('editHistoryDate').value,
            time: document.getElementById('editHistoryTime').value,
            location: document.getElementById('editHistoryLocation').value,
            description: document.getElementById('editHistoryDescription').value,
        };

        fetch(`/api/trackings/${trackingMongoId}/history/${historyId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedHistoryEvent),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    M.toast({
                        html: 'History event updated!',
                        classes: 'blue'
                    });
                    // Refresh current tracking's history
                    const selectedOption = singleTrackingIdSelect.options[singleTrackingIdSelect.selectedIndex];
                    const updatedTracking = JSON.parse(selectedOption.dataset.trackingData);
                    updatedTracking.trackingHistory = data.tracking.trackingHistory; // Get updated history from server
                    selectedOption.dataset.trackingData = JSON.stringify(updatedTracking); // Update stored data
                    renderTrackingHistory(updatedTracking.trackingHistory); // Re-render history
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
                    html: 'Network error or server issue.',
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
            fetch(`/api/trackings/${trackingMongoId}/history/${historyId || historyIndex}`, { // Send _id or index
                    method: 'DELETE',
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        M.toast({
                            html: 'History event deleted!',
                            classes: 'red darken-2'
                        });
                        // Refresh current tracking's history
                        const selectedOption = singleTrackingIdSelect.options[singleTrackingIdSelect.selectedIndex];
                        const updatedTracking = JSON.parse(selectedOption.dataset.trackingData);
                        updatedTracking.trackingHistory = data.tracking.trackingHistory; // Get updated history from server
                        selectedOption.dataset.trackingData = JSON.stringify(updatedTracking); // Update stored data
                        renderTrackingHistory(updatedTracking.trackingHistory); // Re-render history
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
                        html: 'Network error or server issue.',
                        classes: 'red darken-2'
                    });
                });
        }
    }


    // 3. Manage All Trackings Table
    const trackingTableBody = document.getElementById('all-trackings-table-body');

    function fetchAllTrackings() {
        trackingTableBody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 20px;"><div class="preloader-wrapper active"><div class="spinner-layer spinner-blue-only"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div><p>Loading tracking data...</p></td></tr>';

        fetch('/api/trackings')
            .then(response => response.json())
            .then(trackings => {
                renderTrackingsTable(trackings);
                updateDashboardStats(trackings); // Update dashboard stats here
            })
            .catch(error => {
                console.error('Error fetching all trackings:', error);
                trackingTableBody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 20px; color: red;">Failed to load tracking data.</td></tr>';
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
            fetch(`/api/trackings/${trackingMongoId}`, {
                    method: 'DELETE',
                })
                .then(response => response.json())
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
                        html: 'Network error or server issue.',
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
        fetch('/api/trackings')
            .then(response => response.json())
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
            .catch(error => console.error('Error fetching tracking IDs for email:', error));
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

        const formData = new FormData();
        formData.append('to', notificationEmailInput.value);
        formData.append('subject', emailSubjectInput.value);
        formData.append('message', notificationMessageInput.value);

        if (emailAttachmentFileUpload.files.length > 0) {
            formData.append('attachment', emailAttachmentFileUpload.files[0]);
        }

        // Add the trackingId if selected, otherwise it won't be appended
        const selectedTrackingId = emailTrackingIdSelect.options[emailTrackingIdSelect.selectedIndex].textContent;
        if (selectedTrackingId && selectedTrackingId !== "Select Tracking ID (Optional, for pre-filling email)") {
            formData.append('trackingId', selectedTrackingId);
        }


        fetch('/api/send-email', {
                method: 'POST',
                body: formData, // FormData will set the correct Content-Type automatically
            })
            .then(response => response.json())
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
                    html: 'Network error or server issue while sending email.',
                    classes: 'red darken-2'
                });
            });
    });

    // Package File Upload Logic
    const attachFileTrackingIdSelect = document.getElementById('attachFileTrackingIdSelect');
    const packageFileInput = document.getElementById('packageFileInput');

    // Populate tracking IDs for file attachment
    function fetchTrackingIdsForAttachFileSelect() {
        fetch('/api/trackings')
            .then(response => response.json())
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
            .catch(error => console.error('Error fetching tracking IDs for file attachment:', error));
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

        fetch('/api/upload-package-file', {
                method: 'POST',
                body: formData,
            })
            .then(response => response.json())
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
                    html: 'Network error or server issue during file upload.',
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