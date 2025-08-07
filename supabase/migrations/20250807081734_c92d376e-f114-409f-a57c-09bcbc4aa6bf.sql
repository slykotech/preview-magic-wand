-- Delete the remaining demo couple for pranaygoud283@gmail.com
DELETE FROM public.couples 
WHERE user1_id = user2_id 
AND user1_id = (SELECT id FROM auth.users WHERE email = 'pranaygoud283@gmail.com');