
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

// Workforce
const wfTarget = "                            ))}\n                        </div>\n                    </div>\n                )}";
const wfFix = "                            ))}\n                        </div>\n                        </div>\n                        </div>\n                        </div>\n                    </div>\n                )}";
content = content.replace(wfTarget, wfFix);

// Finance
const fnTarget = "                                </div>\n                            </div>\n                        </div>\n                    </div>\n                )}";
const fnFix = "                                </div>\n                            </div>\n                        </div>\n                        </div>\n                        </div>\n                    </div>\n                )}";
content = content.replace(fnTarget, fnFix);

// Modals
const guestTarget = "                                    {guestForm.gstEnabled ? 'INCLUSIVE OF ALL APPLICABLE TAXES' : 'EXCLUDING GST AS PER OPERATIONAL OVERRIDE'}\n                                </div>\n                            </div>\n                            \n                            {/* Modal Footer */}\n                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>";
const guestFix = "                                    {guestForm.gstEnabled ? 'INCLUSIVE OF ALL APPLICABLE TAXES' : 'EXCLUDING GST AS PER OPERATIONAL OVERRIDE'}\n                                </div>\n                            </div>\n                            </div>\n                            \n                            {/* Modal Footer */}\n                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>";
content = content.replace(guestTarget, guestFix);

const cleaningTarget = "                                ></textarea>\n                            </div>\n\n                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>";
const cleaningFix = "                                ></textarea>\n                            </div>\n                            </div>\n\n                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>";
content = content.replace(cleaningTarget, cleaningFix);

fs.writeFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', content);
console.log('Fixed everything for real.');
