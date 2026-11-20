INSERT INTO vendors (company_name, contact_person, email, mobile, address, company_details)
VALUES
 ('HealthPlus', 'Anita Desai', 'anita@healthplus.example', '+919876500101', 'Pune, Maharashtra', 'Healthcare data services'),
 ('TechCorp', 'Rahul Mehta', 'rahul@techcorp.example', '+919876500102', 'Bengaluru, Karnataka', 'Document intelligence'),
 ('Global Solutions', 'Priya Shah', 'priya@globalsolutions.example', '+919876500103', 'Mumbai, Maharashtra', 'AI data operations')
ON CONFLICT (company_name) DO NOTHING;

INSERT INTO employees (full_name, email, mobile, skills, experience_years, employee_type, role_id, status)
VALUES
 ('Aarav Kulkarni','admin@projectflow.example','+919900000001',ARRAY['Leadership','Operations'],8,'Employee',(SELECT id FROM roles WHERE name='HR Manager'),'active'),
 ('Neha Sharma','pm@projectflow.example','+919900000002',ARRAY['Project Management'],6,'Employee',(SELECT id FROM roles WHERE name='Project Manager'),'active'),
 ('Riya Patel','hr@projectflow.example','+919900000003',ARRAY['Recruitment','Operations'],5,'Employee',(SELECT id FROM roles WHERE name='HR Manager'),'active'),
 ('Rohit Kumar','annotator1@projectflow.example','+919900000011',ARRAY['Image Annotation','Medical','Basic English'],3,'Annotator',(SELECT id FROM roles WHERE name='Annotator'),'active'),
 ('Priya Sharma','annotator2@projectflow.example','+919900000012',ARRAY['OCR','Document Classification','English'],2,'Annotator',(SELECT id FROM roles WHERE name='Annotator'),'active'),
 ('Amit Singh','annotator3@projectflow.example','+919900000013',ARRAY['NLP','Sentiment Analysis','English'],4,'Annotator',(SELECT id FROM roles WHERE name='Annotator'),'active'),
 ('Neha Verma','annotator4@projectflow.example','+919900000014',ARRAY['Image Annotation','Computer Vision'],2,'Annotator',(SELECT id FROM roles WHERE name='Annotator'),'active'),
 ('Suresh Kumar','annotator5@projectflow.example','+919900000015',ARRAY['Object Detection','Computer Vision'],5,'Annotator',(SELECT id FROM roles WHERE name='Annotator'),'active'),
 ('Meera Iyer','annotator6@projectflow.example','+919900000016',ARRAY['OCR','English'],1,'Annotator',(SELECT id FROM roles WHERE name='Annotator'),'active'),
 ('Kabir Joshi','annotator7@projectflow.example','+919900000017',ARRAY['Medical','Image Annotation'],3,'Annotator',(SELECT id FROM roles WHERE name='Annotator'),'active'),
 ('Ananya Rao','annotator8@projectflow.example','+919900000018',ARRAY['NLP','Sentiment Analysis'],2,'Annotator',(SELECT id FROM roles WHERE name='Annotator'),'active'),
 ('Vikram Das','annotator9@projectflow.example','+919900000019',ARRAY['Document Classification','OCR'],6,'Annotator',(SELECT id FROM roles WHERE name='Annotator'),'active'),
 ('Sara Khan','annotator10@projectflow.example','+919900000020',ARRAY['Object Detection','English'],1,'Annotator',(SELECT id FROM roles WHERE name='Annotator'),'active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO projects (name,code,vendor_id,description,required_skills,required_annotators,start_date,end_date,application_deadline,project_type,status)
VALUES
 ('Image Annotation (Medical)','PF-IMG-01',(SELECT id FROM vendors WHERE company_name='HealthPlus'),'Annotate medical images using the project guidelines.',ARRAY['Image Annotation','Medical'],8,CURRENT_DATE,CURRENT_DATE+60,CURRENT_DATE+20,'Image Annotation','Published'),
 ('Document Classification','PF-DOC-02',(SELECT id FROM vendors WHERE company_name='TechCorp'),'Classify business documents by category.',ARRAY['OCR','Document Classification'],6,CURRENT_DATE,CURRENT_DATE+45,CURRENT_DATE+25,'Document Classification','Published'),
 ('Sentiment Analysis','PF-NLP-03',(SELECT id FROM vendors WHERE company_name='Global Solutions'),'Label sentiment in short text samples.',ARRAY['NLP','Sentiment Analysis'],5,CURRENT_DATE,CURRENT_DATE+35,CURRENT_DATE+31,'NLP','Published'),
 ('Object Detection','PF-CV-04',(SELECT id FROM vendors WHERE company_name='HealthPlus'),'Identify objects in image datasets.',ARRAY['Object Detection','Computer Vision'],7,CURRENT_DATE,CURRENT_DATE+55,CURRENT_DATE+40,'Computer Vision','Published'),
 ('Audio Transcription','PF-AUD-05',(SELECT id FROM vendors WHERE company_name='TechCorp'),'Transcribe short audio clips.',ARRAY['English','Transcription'],4,CURRENT_DATE,CURRENT_DATE+40,CURRENT_DATE+15,'Transcription','In Progress'),
 ('Retail Product Tags','PF-RET-06',(SELECT id FROM vendors WHERE company_name='Global Solutions'),'Tag products in retail catalog photos.',ARRAY['Image Annotation'],5,CURRENT_DATE,CURRENT_DATE+30,CURRENT_DATE+12,'Image Annotation','On Hold'),
 ('Invoice Extraction','PF-INV-07',(SELECT id FROM vendors WHERE company_name='TechCorp'),'Extract key fields from invoices.',ARRAY['OCR','Document Classification'],3,CURRENT_DATE,CURRENT_DATE+28,CURRENT_DATE+8,'OCR','Draft'),
 ('Road Scene Labels','PF-RDL-08',(SELECT id FROM vendors WHERE company_name='HealthPlus'),'Label road scenes for computer vision.',ARRAY['Object Detection','Computer Vision'],5,CURRENT_DATE-30,CURRENT_DATE-2,CURRENT_DATE-15,'Computer Vision','Completed')
ON CONFLICT (code) DO NOTHING;

INSERT INTO project_applications (project_id,employee_id,status,remarks,applied_at)
SELECT p.id,e.id,d.status,d.remarks,NOW()-d.days*INTERVAL '1 day'
FROM (VALUES
 ('PF-IMG-01','annotator1@projectflow.example','Pending',NULL::TEXT,2),
 ('PF-DOC-02','annotator2@projectflow.example','Approved','Welcome to the project.',5),
 ('PF-NLP-03','annotator3@projectflow.example','Rejected','We will contact you about the next cohort.',8),
 ('PF-CV-04','annotator4@projectflow.example','Pending',NULL,3),
 ('PF-IMG-01','annotator5@projectflow.example','Approved','Great fit for this dataset.',10),
 ('PF-DOC-02','annotator6@projectflow.example','Pending',NULL,1),
 ('PF-NLP-03','annotator7@projectflow.example','Approved','Application approved.',7),
 ('PF-CV-04','annotator8@projectflow.example','Rejected','Required experience not yet met.',9),
 ('PF-IMG-01','annotator9@projectflow.example','Pending',NULL,4),
 ('PF-DOC-02','annotator10@projectflow.example','Approved','Welcome aboard.',12)
) AS d(code,email,status,remarks,days)
JOIN projects p ON p.code=d.code JOIN employees e ON e.email=d.email
ON CONFLICT (project_id,employee_id) DO NOTHING;

INSERT INTO project_assignments (project_id,employee_id)
SELECT project_id,employee_id FROM project_applications WHERE status='Approved'
ON CONFLICT DO NOTHING;

INSERT INTO announcements (title,body,priority,publish_at,expires_at,is_published,target_all)
VALUES
 ('New Project Released!','Medical Image Annotation project is now live. Check your dashboard for details.','High',NOW()-INTERVAL '1 day',NOW()+INTERVAL '30 days',TRUE,TRUE),
 ('System Maintenance','System will be under maintenance on 22 Oct 2026 from 10:00 PM to 12:00 AM.','Normal',NOW()-INTERVAL '2 days',NOW()+INTERVAL '10 days',TRUE,TRUE),
 ('Important Notice','All annotators are requested to update their profiles and skills.','Urgent',NOW()-INTERVAL '3 days',NOW()+INTERVAL '30 days',TRUE,TRUE),
 ('Welcome to the Team!','We are excited to have new annotators on board. Let us build something great together!','Normal',NOW()-INTERVAL '4 days',NOW()+INTERVAL '30 days',TRUE,TRUE),
 ('Annotation Guidelines Update','Please review the latest guidelines before starting new tasks.','Low',NOW()-INTERVAL '5 days',NOW()+INTERVAL '30 days',TRUE,TRUE)
ON CONFLICT (title) DO NOTHING;

INSERT INTO notifications (employee_id,title,body,kind)
SELECT e.id,'Application update','Your application for '||p.name||' is '||a.status||'.','application'
FROM project_applications a JOIN employees e ON e.id=a.employee_id JOIN projects p ON p.id=a.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM notifications n
  WHERE n.employee_id=e.id AND n.title='Application update'
    AND n.body='Your application for '||p.name||' is '||a.status||'.'
);
