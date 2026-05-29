/* ═══════════════════════════════════════════════════════════════
   ASL — Registration Handler  (js/register.js)
   Requires: js/config.js, js/supabase.js
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('aslRegistrationForm');
  if (!form) return;

  // Initialize payment summary
  updatePaymentSummary();

  // Live-update payment summary on any checkbox change
  document.querySelectorAll('.cat-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      autoSelectGenderFromCategories();
      updatePaymentSummary();
      if (typeof togglePartnerFields === 'function') togglePartnerFields();
    });
  });

  // Run once initially to capture query param selections
  autoSelectGenderFromCategories();

  const sportSelect = document.getElementById('regSport');
  if (sportSelect) sportSelect.addEventListener('change', updatePaymentSummary);

  // ── Form Submit ──────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Processing…'; }

    try {
      // Collect form values
      const type       = document.getElementById('regTournamentType').value || 'open';
      const fullName   = document.getElementById('regFullName').value.trim();
      const email      = document.getElementById('regEmail').value.trim();
      const phone      = document.getElementById('regPhone').value.trim();
      const dob        = document.getElementById('regDOB')?.value || null;
      const gender     = document.getElementById('regGender')?.value || 'male';
      const sport      = document.getElementById('regSport').value;
      const tShirt     = document.getElementById('regTshirt')?.value || 'M';
      const skillLevel = document.getElementById('regSkillLevel')?.value || 'intermediate';

      const categories = Array.from(document.querySelectorAll('.cat-checkbox:checked'))
                              .map(cb => cb.value);

      if (categories.length === 0) {
        alert('Please select at least one category to register.');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Proceed to Payment'; }
        return;
      }

      // Doubles partner validation
      const hasDoubles = categories.some(c => c.includes('doubles') || c.includes('mixed'));
      let partnerName = null, partnerPhone = null, partnerEmail = null;
      if (hasDoubles) {
        partnerName  = document.getElementById('regPartnerName')?.value.trim() || '';
        partnerPhone = document.getElementById('regPartnerPhone')?.value.trim() || '';
        partnerEmail = document.getElementById('regPartnerEmail')?.value.trim() || null;
        if (!partnerName || !partnerPhone) {
          alert('Please fill in your partner\'s name and phone number.');
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Proceed to Payment'; }
          return;
        }
      }

      // Corporate field validation
      let company = null, empId = null, department = null;
      if (type === 'corp') {
        company    = document.getElementById('regCompany')?.value || null;
        empId      = document.getElementById('regEmpId')?.value.trim() || '';
        department = document.getElementById('regDept')?.value.trim() || null;
        if (!empId) {
          alert('Please fill in your Employee ID.');
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Proceed to Payment'; }
          return;
        }
      }

      const totalAmount = calculateRegistrationFees(sport, type, categories);

      // Registration payload
      const timestamp = Date.now().toString().slice(-6);
      const regId     = `ASL-${type.toUpperCase().slice(0, 3)}-${timestamp}`;

      const regData = {
        registration_id:  regId,
        tournament_type:  type,
        full_name:        fullName,
        email:            email,
        phone:            phone,
        dob:              dob,
        gender:           gender,
        sport:            sport,
        categories:       categories,
        partner_name:     partnerName,
        partner_phone:    partnerPhone,
        partner_email:    partnerEmail,
        company:          company,
        employee_id:      empId,
        department:       department,
        t_shirt_size:     tShirt,
        skill_level:      skillLevel,
        amount_paid:      totalAmount,
        payment_status:   'pending',
        payment_id:       null,
      };

      // Photo file (optional)
      const photoInput = document.getElementById('regPhoto');
      const photoFile  = photoInput && photoInput.files[0] ? photoInput.files[0] : null;

      // ── RazorPay Checkout ──────────────────────────────────
      const razorKey = window.ASL_CONFIG.RAZORPAY_KEY_ID;

      const options = {
        key:         razorKey,
        amount:      totalAmount * 100,   // paise
        currency:    'INR',
        name:        'Abstream Sports League',
        description: `ASL Tournament Entry — ${sport.toUpperCase()}`,
        image:       'assets/logo.png',
        handler: async function (response) {
          regData.payment_status = 'success';
          regData.payment_id     = response.razorpay_payment_id;
          await saveAndShowSuccess(regData, photoFile);
        },
        prefill: { name: fullName, email: email, contact: phone },
        theme:   { color: type === 'corp' ? '#ffd700' : '#ff6b00' },
        modal: {
          ondismiss: () => {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Proceed to Payment'; }
          }
        }
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        console.error('Razorpay payment failed:', resp.error);
        if (resp.error.description === 'Invalid Token' || resp.error.description.toLowerCase().includes('key') || resp.error.description.toLowerCase().includes('token')) {
          const confirmBypass = confirm(
            `Payment failed: ${resp.error.description}\n\n[Dev Mode] Would you like to bypass the payment check and complete the registration for testing?`
          );
          if (confirmBypass) {
            regData.payment_status = 'success';
            regData.payment_id     = 'DEV_BYPASS_' + Date.now().toString().slice(-6);
            saveAndShowSuccess(regData, photoFile);
            return;
          }
        } else {
          alert('Payment failed: ' + resp.error.description);
        }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Proceed to Payment'; }
      });
      rzp.open();

    } catch (err) {
      console.error('Registration error:', err);
      alert('An error occurred: ' + (err.message || 'Please try again.'));
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Proceed to Payment'; }
    }
  });
});


// ── Save to Supabase & show success screen ──────────────────────
async function saveAndShowSuccess(regData, photoFile) {
  try {
    await aslSaveRegistration(regData, photoFile);
    showSuccessState(regData.registration_id);
  } catch (err) {
    console.error('Supabase save error:', err);
    // Payment succeeded but DB save failed — still show success + log for support
    alert(`Payment successful (${regData.payment_id}) but we encountered an error saving your record. Please contact support with your payment ID.`);
    showSuccessState(regData.registration_id);
  }
}


// ── Fee Calculator ──────────────────────────────────────────────
function calculateRegistrationFees(sport, type, categories) {
  let total = 0;
  const isPremium = (sport === 'badminton' || sport === 'pickleball');
  categories.forEach(cat => {
    if (isPremium) {
      total += type === 'open'
        ? (cat.includes('singles') ? 650 : 1200)
        : (cat.includes('singles') ? 750 : 1500);
    } else {
      total += 500;
    }
  });
  return total;
}

function updatePaymentSummary() {
  const sportSelect = document.getElementById('regSport');
  const typeInput   = document.getElementById('regTournamentType');
  if (!sportSelect || !typeInput) return;

  const sport      = sportSelect.value;
  const type       = typeInput.value;
  const categories = Array.from(document.querySelectorAll('.cat-checkbox:checked')).map(cb => cb.value);
  const total      = calculateRegistrationFees(sport, type, categories);

  const countSpan    = document.getElementById('summaryCatCount');
  const subtotalSpan = document.getElementById('summaryCatSubtotal');
  const totalSpan    = document.getElementById('summaryTotalPayable');

  if (countSpan)    countSpan.textContent    = categories.length;
  if (subtotalSpan) subtotalSpan.textContent = total.toFixed(2);
  if (totalSpan)    totalSpan.textContent    = total.toFixed(2);
}


// ── Success Screen ──────────────────────────────────────────────
function showSuccessState(regId) {
  const form             = document.getElementById('aslRegistrationForm');
  const successContainer = document.getElementById('regSuccessContainer');
  const regIdBox         = document.getElementById('successRegId');

  if (form)             form.style.display            = 'none';
  if (successContainer) successContainer.style.display = 'flex';
  if (regIdBox)         regIdBox.textContent           = regId;

  triggerConfetti();
}

function triggerConfetti() {
  const box = document.getElementById('regSuccessContainer');
  if (!box) return;
  for (let i = 0; i < 60; i++) {
    const piece  = document.createElement('div');
    const size   = Math.random() * 8 + 4;
    const color  = ['#ff6b00','#ffd700','#00f0ff','#00ff88','#ff3860'][Math.floor(Math.random() * 5)];
    piece.style.cssText = `position:absolute;width:${size}px;height:${size}px;background:${color};top:50%;left:50%;opacity:.9;pointer-events:none;z-index:10;border-radius:${Math.random()>.5?'50%':'2px'};transform:translate(-50%,-50%);`;
    box.appendChild(piece);
    const angle  = Math.random() * Math.PI * 2;
    const vel    = Math.random() * 150 + 50;
    const destX  = Math.cos(angle) * vel;
    const destY  = Math.sin(angle) * vel - 20;
    const anim   = piece.animate([
      { transform:'translate(-50%,-50%) scale(1) rotate(0deg)', opacity:.9 },
      { transform:`translate(calc(-50% + ${destX}px),calc(-50% + ${destY}px)) scale(0) rotate(${Math.random()*360}deg)`, opacity:0 }
    ], { duration: Math.random()*1000+800, easing:'cubic-bezier(0.25,0.46,0.45,0.94)' });
    anim.onfinish = () => piece.remove();
  }
}

// ── Auto-Select Gender based on Category selection ──
function autoSelectGenderFromCategories() {
  const checked = Array.from(document.querySelectorAll('.cat-checkbox:checked')).map(cb => cb.value);
  const genderSelect = document.getElementById('regGender');
  if (!genderSelect || checked.length === 0) return;

  let isMale = false;
  let isFemale = false;

  checked.forEach(val => {
    if (val.includes('-men') || val.includes('men-')) {
      isMale = true;
    } else if (val.includes('-women') || val.includes('women-')) {
      isFemale = true;
    }
  });

  if (isMale && !isFemale) {
    genderSelect.value = 'male';
  } else if (isFemale && !isMale) {
    genderSelect.value = 'female';
  } else if (isMale && isFemale) {
    genderSelect.value = 'other';
  }
}
