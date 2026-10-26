package com.beautyshop.model;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
@Document("users")
public class User {
  @Id private String id;
  @Indexed(unique = true) private String email;
  private String password, firstName, lastName, phone, resetToken, shopId;
  private Role role = Role.CLIENT;
  private boolean active = true;
  public String getId(){return id;} public void setId(String v){id=v;}
  public String getEmail(){return email;} public void setEmail(String v){email=v;}
  public String getPassword(){return password;} public void setPassword(String v){password=v;}
  public String getFirstName(){return firstName;} public void setFirstName(String v){firstName=v;}
  public String getLastName(){return lastName;} public void setLastName(String v){lastName=v;}
  public String getPhone(){return phone;} public void setPhone(String v){phone=v;}
  public String getResetToken(){return resetToken;} public void setResetToken(String v){resetToken=v;}
  public String getShopId(){return shopId;} public void setShopId(String v){shopId=v;}
  public Role getRole(){return role;} public void setRole(Role v){role=v;}
  public boolean isActive(){return active;} public void setActive(boolean v){active=v;}
}
