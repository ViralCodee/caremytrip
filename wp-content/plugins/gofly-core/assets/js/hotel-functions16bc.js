jQuery(document).ready(function ($) {
    // Initialize hotel packages from localized data
    let packagesWithQty = gofly_core_hotel_ajax.packages.map(pkg => {
        const regularPrice = parseFloat(pkg.price) || 0;
        const hasSale = pkg.price_sale_on && pkg.price_sale;
        const salePrice = hasSale ? parseFloat(pkg.price_sale) : null;

        // Use sale price if available, otherwise regular price
        const effectivePrice = hasSale ? salePrice : regularPrice;

        return {
            index: pkg.index,
            type: pkg.hotel_pricing_package_typ || pkg.type,
            regular_price: regularPrice,
            sale_price: salePrice,
            has_sale: hasSale,
            price: effectivePrice, // This should be the effective price (sale if available)
            room_limit: parseInt(pkg.room_limit, 10) || 0,
            availability: pkg.availability || {},
            booking_date: '',
            quantity: 1,
            room_quantity: 1,
            rooms: [],
            calculated_price: effectivePrice,
            nights: 1
        };
    });

    // Handle booking date range (check-in & check-out)
    let bookingDates = {
        check_in: '',
        check_out: ''
    };

    function setDefaultBookingDates() {
        const checkInInput = $('#hotel-details-checkin');
        const checkOutInput = $('#hotel-details-checkout');
        const defaultCheckIn = moment().add(1, 'days').format('YYYY-MM-DD');
        const defaultCheckOut = moment().add(3, 'days').format('YYYY-MM-DD');

        if (!moment(checkInInput.val(), 'YYYY-MM-DD', true).isValid()) {
            checkInInput.val(defaultCheckIn);
        }

        if (!moment(checkOutInput.val(), 'YYYY-MM-DD', true).isValid()) {
            checkOutInput.val(defaultCheckOut);
        }

        bookingDates.check_in = checkInInput.val();
        bookingDates.check_out = checkOutInput.val();
    }

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getBookingDateRange(checkIn, checkOut) {
        let dates = [];

        if (!checkIn || !checkOut) {
            return dates;
        }

        const start = new Date(`${checkIn}T00:00:00`);
        const end = new Date(`${checkOut}T00:00:00`);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return dates;
        }

        if (end <= start) {
            dates.push(formatDate(start));
            return dates;
        }

        while (start < end) {
            dates.push(formatDate(start));
            start.setDate(start.getDate() + 1);
        }

        return dates;
    }

    function getNextAvailableDate(pkg, requestedRooms, fromDate) {
        const roomLimit = parseInt(pkg.room_limit, 10) || 0;
        const bookedDates = (pkg.availability && pkg.availability.booked_dates) || {};
        let current = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date();

        if (!roomLimit || Number.isNaN(current.getTime())) {
            return '';
        }

        for (let i = 0; i < 365; i++) {
            const dateKey = formatDate(current);
            const booked = parseInt(bookedDates[dateKey], 10) || 0;

            if ((booked + requestedRooms) <= roomLimit) {
                return dateKey;
            }

            current.setDate(current.getDate() + 1);
        }

        return '';
    }

    function getPackageAvailabilityState(pkg, requestedRooms) {
        if (!pkg) {
            return {
                available: false,
                message: 'This room package is not available for booking.'
            };
        }

        const roomLimit = parseInt(pkg.room_limit, 10) || 0;
        const dates = getBookingDateRange(bookingDates.check_in, bookingDates.check_out);
        const bookedDates = (pkg.availability && pkg.availability.booked_dates) || {};

        if (!roomLimit) {
            return {
                available: false,
                message: 'This room package is not available for booking.'
            };
        }

        if (requestedRooms > roomLimit) {
            return {
                available: false,
                message: `Only ${roomLimit} room(s) can be booked for this package.`
            };
        }

        for (let i = 0; i < dates.length; i++) {
            const dateKey = dates[i];
            const booked = parseInt(bookedDates[dateKey], 10) || 0;

            if ((booked + requestedRooms) > roomLimit) {
                const nextAvailable = getNextAvailableDate(pkg, requestedRooms, dateKey);
                let message = `This room is full on ${moment(dateKey).format('MMMM D, YYYY')}.`;

                if (nextAvailable) {
                    message += ` Next available date: ${moment(nextAvailable).format('MMMM D, YYYY')}.`;
                }

                return {
                    available: false,
                    message: message
                };
            }
        }

        return {
            available: true,
            message: ''
        };
    }

    function updatePackageAvailabilityState() {
        const requestedRooms = $(".room-list .single-room").length || 1;
        let hasAvailablePackage = false;

        $(".hotel-room-list .accordion-item").each(function () {
            const $packageItem = $(this);
            const idx = $packageItem.data("package-index");
            const pkg = packagesWithQty[idx];
            const state = getPackageAvailabilityState(pkg, requestedRooms);
            const $message = $packageItem.find('.hotel-package-availability-message');
            const $button = $packageItem.find('.add-to-cart-btn');

            if (state.available) {
                hasAvailablePackage = true;
                $packageItem.removeClass('room-full-package');
                $message.removeClass('show').text('');
                $button.prop('disabled', false).removeClass('disabled');
            } else {
                $packageItem.addClass('room-full-package');
                $message.addClass('show').text(state.message);
                $button.prop('disabled', true).addClass('disabled');
            }
        });

        $('.hotel-availability-sidebar-message').toggleClass('show', !hasAvailablePackage).text(
            hasAvailablePackage ? '' : 'Rooms are full for the selected date. Please choose another date.'
        );
    }

    /**
     * Calculate nights between check-in and check-out dates
     */
    function calculateNights() {
        if (!bookingDates.check_in || !bookingDates.check_out) {
            return 1; // default to 1 night
        }

        const checkIn = new Date(bookingDates.check_in);
        const checkOut = new Date(bookingDates.check_out);
        const timeDiff = checkOut.getTime() - checkIn.getTime();
        const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

        return nights > 0 ? nights : 1;
    }

    /**
     * Update room prices for all packages
     */
    function updateRoomPrices() {
        const totalRooms = $(".room-list .single-room").length;
        const nights = calculateNights();

        $(".hotel-room-list .accordion-item").each(function () {
            const $packageItem = $(this);
            const $priceElement = $packageItem.find(".room-price");
            const index = $packageItem.data("package-index");

            if (packagesWithQty[index]) {
                const pkg = packagesWithQty[index];

                // Check if package has sale price
                if (pkg.has_sale && pkg.sale_price) {
                    const regularTotal = pkg.regular_price * totalRooms * nights;
                    const saleTotal = pkg.sale_price * totalRooms * nights;

                    // Update with sale price structure: <del>regular</del> sale
                    $priceElement.html('<del>' + gofly_core_hotel_ajax.currency_symbol + regularTotal.toFixed(2) + '</del> ' + gofly_core_hotel_ajax.currency_symbol + saleTotal.toFixed(2));

                    // Update package data with sale price (not regular price)
                    packagesWithQty[index].calculated_price = saleTotal;
                    packagesWithQty[index].effective_price = saleTotal;
                } else {
                    const regularTotal = pkg.regular_price * totalRooms * nights;

                    // Update with regular price only
                    $priceElement.html(gofly_core_hotel_ajax.currency_symbol + regularTotal.toFixed(2));

                    // Update package data with regular price
                    packagesWithQty[index].calculated_price = regularTotal;
                    packagesWithQty[index].effective_price = regularTotal;
                }

                packagesWithQty[index].nights = nights;
                packagesWithQty[index].room_quantity = totalRooms;
            }
        });
    }

    $(document).on('click', '#hotel-calendar-check', function (e) {
        e.preventDefault();

        bookingDates.check_in = $('#hotel-details-checkin').val();
        bookingDates.check_out = $('#hotel-details-checkout').val();

        // Update room prices when dates change
        updateRoomPrices();
        updatePackageAvailabilityState();
    });

    /**
     * Helper: Get current room info from DOM
     */
    function getAllRoomData() {
        let roomData = [];

        $(".room-list .single-room").each(function (i) {
            const adults = parseInt($(this).find('input[name="adult_quantity"]').val(), 10) || 0;
            const children = parseInt($(this).find('input[name="child_quantity"]').val(), 10) || 0;

            roomData.push({
                room_number: i + 1,
                adults: adults,
                children: children,
                total_guests: adults + children
            });
        });

        return roomData;
    }

    /**
     * Update main package data and recalculate prices
     */
    function updatePackageRoomQuantities() {
        const totalRooms = $(".room-list .single-room").length;
        const roomDetails = getAllRoomData();

        // Update all packages
        packagesWithQty.forEach(pkg => {
            pkg.room_quantity = totalRooms;
            pkg.rooms = roomDetails;

            // Calculate total guest quantity
            let totalGuests = 0;
            roomDetails.forEach(r => {
                totalGuests += r.total_guests;
            });
            pkg.quantity = totalGuests;
        });

        // Update room prices
        updateRoomPrices();
        updatePackageAvailabilityState();
    }

    //Quantity Update Guest
    function updateGuestSummary() {
        $('input[name$="_quantity"]').each(function () {
            const name = $(this).attr('name');
            const type = name.replace('_quantity', '');
            const total = parseInt($(this).val(), 10) || 0;
            $('#qnt-' + type).text(total);
        });
    }

    /**
     * Handle guest quantity changes (+/-)
     */
    $(document).on("click", ".hotel-guest-quantity__plus, .hotel-guest-quantity__minus", function (e) {
        e.preventDefault();

        const $btn = $(this);
        const $input = $btn.siblings(".quantity__input");
        let val = parseInt($input.val(), 10) || 0;

        if ($btn.hasClass("hotel-guest-quantity__plus")) {
            val++;
        } else if ($btn.hasClass("hotel-guest-quantity__minus") && val > 0) {
            val--;
        }

        $input.val(val);
        updatePackageRoomQuantities();
        updateGuestSummary();

    });

    /**
     * Handle room deletion
     */
    $(document).on("click", ".room-delete-btn", function () {
        $(this).closest(".single-room").remove();
        updatePackageRoomQuantities();
    });

    /**
     * Handle room add
     */
    $(document).on("click", ".hotel-room-add", function () {

        $(".hotel-room-list").addClass("loading");

        updatePackageRoomQuantities();

        setTimeout(() => {
            $(".hotel-room-list").removeClass("loading");
        }, 500);

    });

    /**
     * Handle booking date change
     */
    $(document).on("change", ".hotel-booking-date-input", function () {
        const idx = $(this).attr("name").split("_").pop();
        if (packagesWithQty[idx]) {
            packagesWithQty[idx].booking_date = $(this).val();
        }
    });


    /**
     * Add to cart with base pricing only
     */
    $(document).on("click", ".add-to-cart-btn", function (e) {
        e.preventDefault();

        var checkoutUrl = gofly_core_hotel_ajax.checkout_url;
        const $button = $(this);
        const idx = $(this).data("package-index");
        const pkg = packagesWithQty[idx];
        const requestedRooms = pkg && pkg.room_quantity ? pkg.room_quantity : 1;
        const availabilityState = getPackageAvailabilityState(pkg, requestedRooms);

        if ($button.data('adding')) {
            return;
        }

        if (!availabilityState.available) {
            alert(availabilityState.message || gofly_core_hotel_ajax.full_message);
            return;
        }

        $button.data('adding', true).addClass('disabled');

        // Send only base package info, let backend calculate final prices
        const pricing = {
            package_index: idx,
            label: pkg.type,
            base_price: pkg.has_sale ? pkg.sale_price : pkg.regular_price, // Per night base price
            regular_price: pkg.regular_price,
            price: pkg.has_sale ? pkg.sale_price : pkg.regular_price,
            has_sale: pkg.has_sale,
            quantity: pkg.quantity, // total guests
            room_quantity: pkg.room_quantity,
            nights: pkg.nights || calculateNights(),
            rooms: pkg.rooms
        };

        $.ajax({
            url: gofly_core_hotel_ajax.ajax_url,
            type: "POST",
            data: {
                action: "egns_hotel_add_to_cart",
                post_id: gofly_core_hotel_ajax.post_id,
                data: {
                    pricing: [pricing],
                    booking_date: bookingDates
                },
            },
            success: function (response) {
                if (response && response.success === false) {
                    $button.data('adding', false).removeClass('disabled');
                    alert(response.data && response.data.message ? response.data.message : gofly_core_hotel_ajax.full_message);
                    return;
                }

                // Redirect to Checkout page on success
                window.location.href = checkoutUrl;

                // Disable the button after it's clicked once
                $button.prop('disabled', true);
            },
            error: function () {
                $button.data('adding', false).removeClass('disabled');
                alert("Failed to add hotel room to cart.");
            }
        });
    });
    // Initialize once
    setDefaultBookingDates();
    updatePackageRoomQuantities();
});
